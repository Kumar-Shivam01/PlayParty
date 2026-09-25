// Video controller for video metadata fetching
async function getVideoInfo(req, res) {
  const { videoId } = req.params;
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!response.ok) {
      return res.status(404).json({ error: "Video not found" });
    }
    const data = await response.json();
    return res.json({ title: data.title, thumbnail: data.thumbnail_url });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch video info" });
  }
}

module.exports = {
  getVideoInfo
};
