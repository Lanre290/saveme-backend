const ytdl = require('ytdl-core');
const fs = require('fs');
const express = require('express');
const path = require('path');

const app = express();

app.use(cors({
    origin: 'https://your-frontend-domain.com', // Allow only this domain
}));

// Endpoint to download YouTube video
app.get('/download', async (req, res) => {
  let videoUrl = req.query.url;  // YouTube video ID from the query parameter

  if (!videoUrl) {
    return res.status(400).send('Video ID is required.');
  }

  // Construct the full YouTube URL from the video ID
  videoUrl = `https://www.youtube.com/watch?v=${videoUrl}`;

  try {
    // Validate the video URL
    const isValidUrl = ytdl.validateURL(videoUrl);
    if (!isValidUrl) {
      return res.status(400).send('Invalid YouTube URL.');
    }

    const videoInfo = await ytdl.getInfo(videoUrl);
    const videoTitle = videoInfo.videoDetails.title;
    const safeTitle = videoTitle.replace(/[^\w\s]/gi, '');  // Make filename safe
    const filePath = path.join(__dirname, `${safeTitle}.mp4`);

    // Stream the video to a file on the server
    const videoStream = ytdl(videoUrl, { format: 'mp4' });

    videoStream.pipe(fs.createWriteStream(filePath))
      .on('finish', () => {
        // After the file is saved, send it to the client for download
        res.download(filePath, `${safeTitle}.mp4`, (err) => {
          if (err) {
            console.error(err);
            return res.status(500).send('Error occurred while downloading the video.');
          }
          
          // Optional: Delete the file after it's sent
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.error('Error deleting file:', unlinkErr);
          });
        });
      })
      .on('error', (err) => {
        console.error('Error while downloading video:', err);
        res.status(500).send('Error occurred while downloading the video.');
      });

  } catch (error) {
    console.error(error);
    res.status(500).send('Error occurred while downloading the video.');
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
