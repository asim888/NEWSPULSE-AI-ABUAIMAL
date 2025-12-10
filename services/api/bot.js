import { Telegraf } from 'telegraf';
import { createClient } from '@supabase/supabase-js';

const bot = new Telegraf(process.env.BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY); // service key so RLS is bypassed

/* ----------  handle every channel post ---------- */
bot.on(['channel_post', 'edited_channel_post'], async (ctx) => {
  const post = ctx.channelPost || ctx.editedChannelPost;
  const chatId   = post.chat.id;
  const msgId    = post.message_id;
  const text     = post.text || post.caption || '';

  let mediaUrl = null;
  let mediaType = null;

  const photo   = post.photo?.pop();            // biggest photo
  const video   = post.video;
  const anim    = post.animation;

  if (photo) {
    mediaUrl  = (await ctx.telegram.getFileLink(photo.file_id)).href;
    mediaType = 'photo';
  } else if (video) {
    mediaUrl  = (await ctx.telegram.getFileLink(video.file_id)).href;
    mediaType = 'video';
  } else if (anim) {
    mediaUrl  = (await ctx.telegram.getFileLink(anim.file_id)).href;
    mediaType = 'animation';
  }

  const { error } = await supabase.from('telegram_posts').upsert({
    chat_id:   chatId,
    message_id:msgId,
    message:   text,
    media_url: mediaUrl,
    media_type:mediaType,
  }, { onConflict: 'chat_id,message_id' });

  if (error) console.error('Supabase insert err', error);
});

export default bot.webhookCallback('/api/bot');
