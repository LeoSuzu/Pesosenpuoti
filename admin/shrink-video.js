// Re-encode a video in the browser before upload: play it muted into a
// downscaled canvas and record that canvas. No libraries; takes about as long
// as the clip itself. Audio is dropped — the site plays these muted.
const MIME_TYPES = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

export async function shrinkVideo(file, { maxDimension = 1280, fps = 24, bitsPerSecond = 2_500_000, keepIfUnderBytes = 8 * 1024 * 1024, onProgress } = {}) {
  if (!file?.type?.startsWith('video/') || !window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return file;
  const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) return file;

  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  let stream;
  try {
    video.src = url;
    await new Promise((resolve, reject) => {
      video.addEventListener('loadedmetadata', resolve, { once: true });
      video.addEventListener('error', () => reject(new Error('Videota ei voitu lukea.')), { once: true });
    });
    const longest = Math.max(video.videoWidth, video.videoHeight);
    if (!longest || (longest <= maxDimension && file.size <= keepIfUnderBytes)) return file;

    const scale = Math.min(1, maxDimension / longest);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(2, Math.floor((video.videoWidth * scale) / 2) * 2);
    canvas.height = Math.max(2, Math.floor((video.videoHeight * scale) / 2) * 2);
    const ctx = canvas.getContext('2d');

    stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitsPerSecond });
    const chunks = [];
    recorder.addEventListener('dataavailable', (event) => { if (event.data.size) chunks.push(event.data); });
    const stopped = new Promise((resolve) => recorder.addEventListener('stop', resolve, { once: true }));
    const ended = new Promise((resolve) => video.addEventListener('ended', resolve, { once: true }));

    let done = false;
    const schedule = video.requestVideoFrameCallback
      ? (fn) => video.requestVideoFrameCallback(fn)
      : (fn) => requestAnimationFrame(fn);
    const draw = () => {
      if (done) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (Number.isFinite(video.duration) && video.duration > 0) onProgress?.(Math.min(1, video.currentTime / video.duration));
      schedule(draw);
    };

    recorder.start(1000);
    await video.play();
    draw();
    await ended;
    done = true;
    recorder.stop();
    await stopped;

    const baseType = mimeType.split(';')[0];
    const blob = new Blob(chunks, { type: baseType });
    if (!blob.size || blob.size >= file.size) return file;
    const extension = baseType === 'video/webm' ? '.webm' : '.mp4';
    return new File([blob], file.name.replace(/\.[^./]*$/, '') + extension, { type: baseType });
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
    video.removeAttribute('src');
    URL.revokeObjectURL(url);
  }
}
