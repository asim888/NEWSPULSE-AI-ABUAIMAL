import { Category, Article } from '../types';
import { RSS_FEEDS, TELEGRAM_CHANNEL_URL, ASSET_LOGO_URL } from '../constants';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const CACHE_PREFIX = 'news_pulse_cache_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 Minutes for fast Breaking News

const generateId = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'rss_' + Math.abs(hash).toString(36);
};

export const fetchGalleryPosts = async (): Promise<Article[]> => {
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!
                .from('gallery_posts')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (data && !error) {
                return data.map((post: any) => ({
                    id: `gal_${post.id}`,
                    title: post.title || "Gallery Post",
                    source: 'Azad Gallery',
                    timestamp: new Date(post.created_at).toLocaleDateString(),
                    description: post.description || "",
                    category: Category.GALLERY,
                    url: '#',
                    imageUrl: post.media_url,
                    descriptionRomanUrdu: post.description
                }));
            }
        } catch (e) {
            console.warn("Failed to fetch Gallery posts", e);
        }
    }
    return [];
};

export const addGalleryPost = async (post: { title: string, description: string, media_url: string }) => {
    if (!isSupabaseConfigured()) throw new Error("Database not connected");
    
    const { data, error } = await supabase!
        .from('gallery_posts')
        .insert([
            {
                title: post.title,
                description: post.description,
                media_url: post.media_url
            }
        ])
        .select();
    
    if (error) throw error;
    return data;
};

// Helper to extract image from style string
const extractBgImage = (style: string): string => {
    const match = style.match(/url\(['"]?(.*?)['"]?\)/);
    return match ? match[1] : '';
};

export const fetchNewsForCategory = async (category: Category): Promise<Article[]> => {
    if (category === Category.AZAD_STUDIO) {
        console.log(`[Azad Studio] Fetching Telegram from: ${TELEGRAM_CHANNEL_URL}`);
        
        // Multi-proxy Strategy for Robustness
        const proxies = [
            // AllOrigins with cache buster
            { url: `https://api.allorigins.win/get?url=${encodeURIComponent(TELEGRAM_CHANNEL_URL + '?t=' + Date.now())}`, type: 'json' },
            // CodeTabs
            { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(TELEGRAM_CHANNEL_URL)}`, type: 'text' },
             // CORS Proxy IO
            { url: `https://corsproxy.io/?${encodeURIComponent(TELEGRAM_CHANNEL_URL)}`, type: 'text' }
        ];

        for (const proxy of proxies) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

                const response = await fetch(proxy.url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    console.warn(`Proxy ${proxy.url} failed with status ${response.status}`);
                    continue;
                }

                let html = '';
                if (proxy.type === 'json') {
                    const data = await response.json();
                    html = data.contents;
                } else {
                    html = await response.text();
                }

                if (!html || !html.includes('tgme_widget_message')) {
                    continue;
                }

                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const messages = Array.from(doc.querySelectorAll('.tgme_widget_message'));

                if (messages.length > 0) {
                     const articles: Article[] = messages.map((msg) => {
                        const id = msg.getAttribute('data-post') || Math.random().toString(36).substr(2, 9);
                        
                        // Extract Text
                        const textEl = msg.querySelector('.tgme_widget_message_text');
                        const rawHtml = textEl?.innerHTML || '';
                        let rawText = textEl?.textContent || '';
                        
                        // Extract Date
                        const timeEl = msg.querySelector('.time');
                        const dateTime = timeEl?.getAttribute('datetime');
                        const timestamp = dateTime ? new Date(dateTime).toLocaleString() : 'Recent';
                        
                        // Extract Image
                        const photoWrap = msg.querySelector('.tgme_widget_message_photo_wrap');
                        let imageUrl = '';
                        let videoUrl = '';
                        let mediaType: 'image' | 'video' = 'image';

                        if (photoWrap) {
                            const style = photoWrap.getAttribute('style') || '';
                            imageUrl = extractBgImage(style);
                        }
                        
                        // Extract Video
                        const videoWrap = msg.querySelector('.tgme_widget_message_video_player');
                        if (videoWrap) {
                            mediaType = 'video';
                            const thumbStyle = videoWrap.querySelector('.tgme_widget_message_video_thumb')?.getAttribute('style') || '';
                            if (!imageUrl) imageUrl = extractBgImage(thumbStyle);
                            
                            // Try to get actual video src
                            const videoTag = videoWrap.querySelector('video');
                            if (videoTag) {
                                videoUrl = videoTag.getAttribute('src') || '';
                            }
                        }

                        // Heuristic for Title
                        let title = "Azad Studio Update";
                        if (rawText) {
                            const lines = rawText.split('\n').filter(l => l.trim().length > 0);
                            if (lines.length > 0) {
                                // Use first line as title, truncate if too long
                                title = lines[0].length > 80 ? lines[0].substring(0, 80) + "..." : lines[0];
                            }
                        } else {
                            if (mediaType === 'video') title = "New Video Upload";
                            else if (imageUrl) title = "New Image Upload";
                        }
                        
                        // If no text, use a generic description
                        if (!rawText) rawText = "Check out this update from Azad Studio Official.";

                        return {
                            id: `tg_live_${id}`,
                            title: title,
                            source: 'Azad Studio Live',
                            timestamp: timestamp,
                            description: rawText,
                            content: rawText,
                            category: Category.AZAD_STUDIO,
                            url: `https://t.me/${id.replace('/', '/')}`,
                            imageUrl: imageUrl || ASSET_LOGO_URL,
                            videoUrl: videoUrl,
                            mediaType: mediaType,
                            descriptionRomanUrdu: rawText 
                        };
                    }).reverse();

                    console.log(`[Azad Studio] Successfully fetched ${articles.length} posts via ${proxy.url}`);
                    return articles; // Success! Return immediately
                }
            } catch (e) {
                console.warn(`[Azad Studio] Error with proxy ${proxy.url}:`, e);
            }
        }

        console.warn("[Azad Studio] All live fetch proxies failed. Trying Supabase fallback.");

        // Fallback to Supabase Archive if Live Fetch Fails
        if (isSupabaseConfigured()) {
            try {
                const { data } = await supabase!
                    .from('telegram_posts')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(20);
                
                if (data && data.length > 0) {
                    return data.map((post: any) => {
                        const isVideo = post.media_type === 'video';
                        return {
                            id: `tg_db_${post.id}`,
                            title: post.title || "Azad Studio Archive",
                            source: 'Azad Studio (Archive)',
                            timestamp: new Date(post.created_at).toLocaleString(),
                            description: post.message,
                            content: post.message,
                            category: Category.AZAD_STUDIO,
                            url: '#',
                            // For DB items, we assume media_url is the video if type is video
                            imageUrl: isVideo ? '' : post.media_url, 
                            videoUrl: isVideo ? post.media_url : '',
                            mediaType: post.media_type || 'image',
                        };
                    });
                }
            } catch (e) {
                console.warn("[Azad Studio] Supabase Fallback Failed", e);
            }
        }
        
        return [];
    }

    if (category === Category.GALLERY) {
        return fetchGalleryPosts();
    }

    let supabaseStaleData: Article[] = [];
    let localStaleData: Article[] = [];

    // 1. Supabase RSS Cache
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase!
                .from('rss_feed_cache')
                .select('*')
                .eq('category', category)
                .single();

            if (data && !error && data.articles && data.articles.length > 0) {
                const lastUpdate = new Date(data.updated_at).getTime();
                const isFresh = (Date.now() - lastUpdate) < CACHE_DURATION;
                
                if (isFresh) {
                    return data.articles;
                } else {
                    supabaseStaleData = data.articles;
                }
            }
        } catch (e) {
            console.warn(`Supabase RSS cache check failed for ${category}`, e);
        }
    }

    // 2. Local Storage Cache
    const cacheKey = CACHE_PREFIX + category;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
        try {
            const parsed = JSON.parse(cachedData);
            if (Date.now() - parsed.timestamp < CACHE_DURATION) {
                return parsed.articles;
            }
            localStaleData = parsed.articles;
        } catch (e) {
            console.error("Cache parse error", e);
        }
    }

    // 3. Live Fetch
    const feedUrls = RSS_FEEDS[category];
    if (!feedUrls || feedUrls.length === 0) return [];

    const fetchPromises = feedUrls.map(async (url) => {
        const proxies = [
            { url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, type: 'json' },
            { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, type: 'text' },
            { url: `https://corsproxy.io/?${encodeURIComponent(url)}`, type: 'text' },
            { url: `https://thingproxy.freeboard.io/fetch/${url}`, type: 'text' }
        ];

        for (const proxy of proxies) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000); // Shorter timeout (6s)

                const response = await fetch(proxy.url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`Proxy status ${response.status}`);

                let rssContent = "";
                if (proxy.type === 'json') {
                    const data = await response.json();
                    rssContent = data.contents;
                } else {
                    rssContent = await response.text();
                }

                if (!rssContent) continue;

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(rssContent, "text/xml");
                if (xmlDoc.querySelector("parsererror")) continue;

                const items = xmlDoc.querySelectorAll("item");
                if (items.length === 0) continue;

                const sourceName = new URL(url).hostname.replace('www.', '').replace('feeds.', '').split('.')[0].toUpperCase();

                return Array.from(items).map(item => {
                    const title = item.querySelector("title")?.textContent || "No Title";
                    const link = item.querySelector("link")?.textContent || "";
                    const pubDate = item.querySelector("pubDate")?.textContent || "";
                    
                    // Fetch full content if available
                    const contentEncoded = item.getElementsByTagName("content:encoded")[0]?.textContent 
                        || item.querySelector("encoded")?.textContent
                        || "";
                    
                    const rawDescription = item.querySelector("description")?.textContent || "";
                    
                    const fullTextSource = contentEncoded || rawDescription;

                    // Clean Full Text
                    const tempDiv = document.createElement("div");
                    tempDiv.innerHTML = fullTextSource;
                    const fullCleanText = tempDiv.textContent?.trim() || "";
                    
                    // Create Short Summary for Card
                    const cardDescription = fullCleanText.length > 200 
                        ? fullCleanText.substring(0, 200) + "..." 
                        : fullCleanText;

                    let imageUrl = '';
                    const mediaContent = item.getElementsByTagName("media:content")[0];
                    if (mediaContent) imageUrl = mediaContent.getAttribute("url") || '';
                    if (!imageUrl) {
                        const imgMatch = fullTextSource.match(/<img[^>]+src="([^">]+)"/);
                        if (imgMatch) imageUrl = imgMatch[1];
                    }

                    return {
                        id: generateId(link),
                        title: title,
                        source: sourceName,
                        timestamp: pubDate ? new Date(pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
                        description: cardDescription, // Truncated for UI Card
                        content: fullCleanText, // Full text for Modal/AI
                        category: category,
                        url: link,
                        imageUrl: imageUrl 
                    };
                });
            } catch (e) {
               // Next proxy
            }
        }
        return [];
    });

    try {
        const results = await Promise.all(fetchPromises);
        const allArticles = results.flat();

        const seenTitles = new Set();
        const uniqueArticles = allArticles.filter(article => {
            const normalizedTitle = article.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (seenTitles.has(normalizedTitle)) return false;
            seenTitles.add(normalizedTitle);
            return true;
        });

        if (uniqueArticles.length > 0) {
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                articles: uniqueArticles
            }));

            if (isSupabaseConfigured()) {
                supabase!.from('rss_feed_cache')
                    .upsert({ 
                        category: category, 
                        articles: uniqueArticles,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'category' })
                    .then(({ error }) => {
                        if (error) console.error(`[Supabase RSS] Failed update`, error);
                    });
            }

            return uniqueArticles;
        }
    } catch (err) {
        console.warn("RSS Network fetch failed", err);
    }

    // 4. Fallback (Stale)
    if (supabaseStaleData.length > 0) return supabaseStaleData;
    if (localStaleData.length > 0) return localStaleData;

    return [];
};
