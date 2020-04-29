const electron = require('electron');
const dialog = electron.remote.dialog;
const app = electron.remote.app;
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const frames = [];
let isPlaying = false;

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
// The frame rate for the animation, on screen and for the saved MP4 file.
const FRAME_RATE = 4;

const video = window.document.querySelector('video');
const canvas = window.document.querySelector('canvas');
const ctx = canvas.getContext('2d');

function initialize () {
  let errorCallback = (error) => {
    console.log(`There was an error connecting to the video stream: ${error.message}`);
  };

  window.navigator.webkitGetUserMedia({video: true, audio: false}, (localMediaStream) => {
    video.srcObject = localMediaStream;
  }, errorCallback);

  document.querySelector('#add-frame').addEventListener('click', addFrame);
  document.querySelector('#play-animation').addEventListener('click', () => {
    if (!isPlaying) {
      isPlaying = true;
      setButtonsOnPlay(isPlaying);
      playAnimation();
    } else {
      isPlaying = false;
      setButtonsOnPlay(isPlaying);
      refreshCanvas();
    }
  });
  document.querySelector('#remove-frame').addEventListener('click', removeFrame);
  document.querySelector('#save-animation').addEventListener('click', handleSaveVideo);

  // ctx.scale(-1, 1);
  // ctx.translate(-CANVAS_WIDTH, 0);

  // fs.readdir('./ffmpeg/mac/ffmpeg', (err, files) => {
  //   files.forEach(file => {
  //     console.log(file);
  //   });
  // });

  ffmpeg.setFfmpegPath('./ffmpeg/mac/ffmpeg');
}

// Show the most-recent available frame
function refreshCanvas() {
  canvas.style.opacity = 0.5;
  if (frames.length > 0) {
    const drawing = new Image();
    drawing.src = frames[frames.length - 1];
    drawing.onload = function() {
      ctx.drawImage(drawing, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    };
  } else {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

function setButtonsOnPlay(isPlaying) {
  const playButton = document.querySelector('#play-animation');
  const playIcon = document.querySelector('#play-icon');
  if (isPlaying) {
    playButton.classList.add('active');
    playIcon.classList.remove('fa', 'fa-play');
    playIcon.classList.add('fas', 'fa-stop');
  } else {
    playButton.classList.remove('active');
    playIcon.classList.remove('fas', 'fa-stop');
    playIcon.classList.add('fa', 'fa-play');
  }
}

function addFrame() {
  ctx.save();
  ctx.scale(-1, 1);
  ctx.translate(-CANVAS_WIDTH, 0);
  ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.restore();
  frames.push(canvas.toDataURL());
  
}

function removeFrame() {
  frames.pop();
  refreshCanvas();
}

function playAnimation() {
  showNextFrame(ctx, frames, 0);

  function showNextFrame(context, arr, index) {
    if (index < arr.length && isPlaying) {
      canvas.style.opacity = 1;
      const drawing = new Image();
      drawing.src = arr[index];
      drawing.onload = function() {
        context.drawImage(drawing, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        setTimeout(showNextFrame, 1000 / FRAME_RATE, context, arr, index + 1);
      };
    } else {
      isPlaying = false;
      setButtonsOnPlay(isPlaying);
      refreshCanvas();
    }
  }
}

function handleSaveVideo() {
  const options = {
    title: "Save the animation",
    defaultPath: app.getPath('documents') + '/animation.mp4',
    buttonLabel: 'Save animation',
    properties: ['createDirectory']
  }
  dialog.showSaveDialog(options)
    .then(response => {
      if (!response.canceled) {
        saveVideo(response.filePath)
      }
      console.log(response.filePath)
    })
}

function saveVideo(output) {
  if (output) {
    console.log(output)

    const re = /^(.+\/)(.+)\.(.+)$/
    const [, directory, fileName, extension] = output.split(re)
    // "^(.+\/)" matches directory path.
    // "(.+)" matches file name without extension.
    // "(.+)$" matches extension.
    console.log(directory, fileName, extension)
    
    const tempDir = `${directory}tmp-${('000000' + Math.floor(Math.random() * 1000000)).slice(-6)}/`;
    fs.mkdirSync(tempDir);

    for (let i = 0; i < frames.length; i++) {
      const frameBase64Data = frames[i].replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
      const tempPath = tempDir + fileName + '-' + ('0' + i).slice(-2) + '.png';
      fs.writeFile(tempPath, frameBase64Data, 'base64', (err) => {
        if (err) {
          alert(`There was a problem saving the photo: ${err.message}`);
        }
      });
    }

    const input = tempDir + fileName + '-%02d.png';
    // const output = directory + fileName + '.mp4';
    // ffmpeg -y -framerate " + FRAME_RATE + " -i " + dirName + "frame-%03d.png -c:v libx264 -r 30 -pix_fmt yuv420p " + dirName + "animation.mp4"
    ffmpeg(input)
      .inputOptions([`-r ${FRAME_RATE}`])
      .outputOptions(['-y', `-r ${30}`, '-pix_fmt yuv420p'])
      .videoCodec('libx264')
      .on('error', function(err) {
        console.log('An error occurred: ' + err.message);
      })
      .on('end', () => {
        console.log('Processing finished !');
        fs.readdirSync(tempDir).forEach((file) => {
          fs.unlinkSync(tempDir + file);
        });
        fs.rmdirSync(tempDir);
      })
      .save(output);
  }
}

// function uploadVideo() {
//   const configObj = {
//     method: 'POST',
//     headers:
//     {
//       "Authorization": "Bearer [YOUR_ACCESS_TOKEN]",
//       "Accept": "application/json",
//       "Content-Type": "application/json"
//     },
//     body: {
//       "snippet": {
//         "categoryId": "22",
//         "description": "Description of uploaded video.",
//         "title": "Test video upload."
//       },
//       "status": {
//         "privacyStatus": "private"
//       }
//     }
//   };
  
//   const URL = 'https://www.googleapis.com/youtube/v3/videos?part=snippet%2Cstatus&key=[YOUR_API_KEY]'
//   fetch("http://localhost:3000/toys", configObj)
//     .then(function(response) {
//       return response.json();
//     })
//     .then(function(object) {
//       console.log(object);
//     })
//     .catch(function(error) {
//       alert(error.message);
//       console.log(error.message);
//     });
// }

window.onload = initialize;