import React, { useState, useEffect } from 'react';
import { Category, Article, EnhancedArticleContent } from './types';
import { 
    APP_NAME, TAGLINE, LOGO_URL, ASSET_LOGO_URL, 
    FALLBACK_NEWS
} from './constants';
import { fetchNewsForCategory } from './services/rssService';
import { enhanceArticle } from './services/geminiService';

// --- Icons ---
const IconExpand = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
    </svg>
);

const IconPlay = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth="0">
        <path d="M5 3l14 9-14 9V3z"/>
    </svg>
);

const IconClose = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

export default function App() {
    const [category, setCategory] = useState<Category>(Category.HYDERABAD);
    const [newsItems, setNewsItems] = useState<Article[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [lightboxArticle, setLightboxArticle] = useState<Article | null>(null);
    
    // AI State
    const [enhancedContent, setEnhancedContent] = useState<EnhancedArticleContent | null>(null);
    const [translating, setTranslating] = useState(false);

    // Fetch News on Category Change
    useEffect(() => {
        let mounted = true;
        const loadNews = async () => {
            setLoading(true);
            try {
                const items = await fetchNewsForCategory(category);
                if (mounted) {
                    setNewsItems(items.length > 0 ? items : FALLBACK_NEWS.filter(n => n.category === category));
                }
            } catch (err) {
                console.error("Failed to load news", err);
                if (mounted) {
                    setNewsItems(FALLBACK_NEWS.filter(n => n.category === category));
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };
        loadNews();
        return () => { mounted = false; };
    }, [category]);

    // Enhance Article with AI when selected
    useEffect(() => {
        if (selectedArticle && !selectedArticle.content && !selectedArticle.descriptionRomanUrdu) {
            const translate = async () => {
                setTranslating(true);
                try {
                    const res = await enhanceArticle(
                        selectedArticle.id, 
                        selectedArticle.title, 
                        selectedArticle.description
                    );
                    setEnhancedContent(res);
                } catch (e) {
                    console.error("Translation failed", e);
                } finally {
                    setTranslating(false);
                }
            };
            translate();
        } else {
            setEnhancedContent(null);
        }
    }, [selectedArticle]);

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-500 selection:text-black">
            {/* Sticky Header */}
            <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-zinc-800">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={LOGO_URL} alt="Logo" className="h-8 w-8 object-contain" />
                        <h1 className="text-xl font-bold font-serif text-yellow-500 tracking-wider">{APP_NAME}</h1>
                    </div>
                </div>
                
                {/* Category Navigation */}
                <div className="overflow-x-auto border-t border-zinc-800 scrollbar-hide">
                    <div className="flex px-4 min-w-max">
                        {(Object.values(Category) as string[]).map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setCategory(cat as Category)}
                                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                                    category === cat 
                                    ? 'border-yellow-500 text-yellow-500' 
                                    : 'border-transparent text-gray-400 hover:text-white'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="container mx-auto px-4 py-8">
                <div className="mb-8 text-center">
                    <h2 className="text-2xl font-serif text-white mb-2">{category} News</h2>
                    <p className="text-gray-400 text-sm">{TAGLINE}</p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : newsItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {newsItems.map(article => (
                            <div 
                                key={article.id}
                                onClick={() => setSelectedArticle(article)}
                                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-yellow-600 transition-all cursor-pointer group flex flex-col h-full hover:shadow-[0_0_20px_rgba(212,175,55,0.1)]"
                            >
                                {/* Media Section (Video or Image) */}
                                {article.mediaType === 'video' ? (
                                    article.videoUrl ? (
                                        <div className="aspect-video w-full overflow-hidden relative bg-black border-b border-zinc-800 group/video">
                                            <video 
                                                src={article.videoUrl} 
                                                poster={article.imageUrl}
                                                controls 
                                                className="w-full h-full object-contain"
                                                onClick={(e) => e.stopPropagation()} 
                                            />
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setLightboxArticle(article); }}
                                                className="absolute top-2 right-2 bg-black/60 p-2 rounded-full text-white opacity-0 group-hover/video:opacity-100 transition-opacity hover:bg-yellow-600 hover:text-black z-10 backdrop-blur-sm"
                                                title="Full Screen"
                                            >
                                                <IconExpand />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="aspect-video w-full overflow-hidden relative group-hover:opacity-90 transition-opacity bg-black border-b border-zinc-800">
                                            <img 
                                                src={article.imageUrl || ASSET_LOGO_URL} 
                                                alt={article.title} 
                                                className="w-full h-full object-cover opacity-60"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <IconPlay />
                                            </div>
                                            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded">
                                                Watch on Telegram
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <div className="aspect-video w-full overflow-hidden relative border-b border-zinc-800 group/image">
                                        <img 
                                            src={article.imageUrl || ASSET_LOGO_URL} 
                                            alt={article.title} 
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            onError={(e) => { (e.target as HTMLImageElement).src = ASSET_LOGO_URL; }} 
                                        />
                                        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent h-12"></div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setLightboxArticle(article); }}
                                            className="absolute top-2 right-2 bg-black/60 p-2 rounded-full text-white opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-yellow-600 hover:text-black z-10 backdrop-blur-sm"
                                            title="View Full Image"
                                        >
                                            <IconExpand />
                                        </button>
                                    </div>
                                )}
                                
                                {/* Content Section */}
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
                                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                            <span className="uppercase tracking-widest text-yellow-500">{article.timestamp}</span>
                                            {article.mediaType === 'video' && (
                                                <span className="bg-red-900/50 text-red-400 px-2 py-0.5 rounded border border-red-800/50">VIDEO</span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-zinc-500">{article.source || "Telegram"}</span>
                                    </div>
                                    
                                    <h3 className="text-white font-serif font-bold text-xl mb-3 leading-snug group-hover:text-yellow-500 transition-colors line-clamp-2">
                                        {article.title}
                                    </h3>
                                    <p className="text-gray-400 text-sm line-clamp-3 whitespace-pre-line leading-relaxed mb-4 flex-1">
                                        {article.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-zinc-900 rounded-xl border border-dashed border-zinc-800">
                        <p className="text-gray-500">No news articles found for this category.</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="text-yellow-500 hover:underline mt-2 text-sm"
                        >
                            Refresh Page
                        </button>
                    </div>
                )}
            </main>

            {/* Article Detail Modal */}
            {selectedArticle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                    <div className="bg-zinc-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-700 relative shadow-2xl">
                        <button 
                            onClick={() => setSelectedArticle(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white bg-black/50 p-2 rounded-full z-10 hover:bg-zinc-800 transition-colors"
                        >
                            <IconClose />
                        </button>
                        
                        <div className="p-0">
                            {/* Hero Image in Modal */}
                           <div className="w-full h-64 md:h-80 relative">
                               <img 
                                    src={selectedArticle.imageUrl || ASSET_LOGO_URL} 
                                    className="w-full h-full object-cover" 
                                    alt={selectedArticle.title}
                                    onError={(e) => { (e.target as HTMLImageElement).src = ASSET_LOGO_URL; }} 
                               />
                               <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent"></div>
                               <div className="absolute bottom-6 left-6 right-6">
                                   <h2 className="text-2xl md:text-3xl font-serif font-bold text-white shadow-black drop-shadow-lg leading-tight">
                                       {selectedArticle.title}
                                   </h2>
                               </div>
                           </div>
                           
                           <div className="p-6 md:p-8 space-y-6">
                               <div className="flex items-center gap-4 text-xs text-gray-500 uppercase tracking-widest border-b border-zinc-800 pb-4">
                                   <span>{selectedArticle.timestamp}</span>
                                   <span>•</span>
                                   <span>{selectedArticle.source}</span>
                               </div>

                               {/* AI Enhancement Display */}
                               {translating ? (
                                   <div className="animate-pulse bg-zinc-800 h-32 rounded-lg p-5 flex flex-col justify-center space-y-3">
                                       <div className="h-4 bg-zinc-700 rounded w-3/4"></div>
                                       <div className="h-4 bg-zinc-700 rounded w-1/2"></div>
                                       <p className="mt-4 text-sm text-yellow-500">Generating AI Translation & Summary...</p>
                                   </div>
                               ) : enhancedContent ? (
                                   <div className="space-y-6">
                                       {/* Summary Card */}
                                       <div className="bg-zinc-800/50 p-5 rounded-lg border-l-4 border-yellow-500">
                                            <h4 className="text-yellow-500 text-xs uppercase tracking-widest mb-3 font-bold">AI Summary</h4>
                                            <p className="text-gray-200 leading-relaxed text-lg">{enhancedContent.summaryShort}</p>
                                       </div>
                                       
                                       {/* Full Article */}
                                       <div>
                                            <h3 className="text-white font-bold text-xl mb-3">Full Story</h3>
                                            <div className="text-gray-300 leading-relaxed space-y-4 whitespace-pre-line">
                                                {enhancedContent.fullArticle}
                                            </div>
                                       </div>

                                       {/* Roman Urdu */}
                                       <div className="bg-zinc-800/30 p-5 rounded-lg">
                                            <h4 className="text-gray-500 text-xs uppercase tracking-widest mb-2 font-bold">Roman Urdu</h4>
                                            <p className="text-gray-400 italic leading-relaxed">{enhancedContent.summaryRomanUrdu}</p>
                                       </div>
                                   </div>
                               ) : (
                                   <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-line">
                                       {selectedArticle.description}
                                   </p>
                               )}

                               <div className="flex gap-3 pt-6 border-t border-zinc-800">
                                   <a 
                                     href={selectedArticle.url} 
                                     target="_blank" 
                                     rel="noopener noreferrer"
                                     className="px-6 py-3 bg-yellow-600 text-black font-bold rounded-full hover:bg-yellow-500 transition-colors shadow-lg hover:shadow-yellow-500/20"
                                   >
                                     Read Original Source
                                   </a>
                               </div>
                           </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox for Zoomed Media */}
            {lightboxArticle && (
                <div 
                    className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4" 
                    onClick={() => setLightboxArticle(null)}
                >
                    <button className="absolute top-5 right-5 text-white p-2 bg-zinc-800/50 rounded-full hover:bg-zinc-700 transition-colors">
                        <IconClose />
                    </button>
                    <div className="w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        {lightboxArticle.mediaType === 'video' && lightboxArticle.videoUrl ? (
                            <video 
                                src={lightboxArticle.videoUrl} 
                                controls 
                                autoPlay 
                                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" 
                            />
                        ) : (
                            <img 
                                src={lightboxArticle.imageUrl || ASSET_LOGO_URL} 
                                alt="Full Size"
                                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
