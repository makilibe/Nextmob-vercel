import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Peer from 'skyway-js';
const peer = new Peer({ key: '00403e5e-fdf0-4ad6-bdf9-88c71127156f' });

export default function room() {
  const localStreamRef = useRef(null);

  let jsLocalStream;
  if (process.browser) {
    jsLocalStream = document.getElementById('js-local-stream');
  }
  const localStreamSetting = async () => {
    localStreamRef.current.srcObject = await navigator.mediaDevices.getUserMedia(
      {
        audio: true,
        video: true,
      }
    );
    await localStreamRef.current.play();
  };

  const router = useRouter();
  const roomId = router.query.rid;
  console.log(roomId);
  const JoinTrigger = async () => {
    if (!peer.open) {
      return;
    }
    const room = peer.joinRoom(roomId, {
      mode: 'mesh',
      stream: localStreamRef.current.srcObject,
    });

    room.once('open', () => {
      console.log('=== You joined ===\n');
      console.log(roomId);
    });
    room.on('peerJoin', (peerId) => {
      console.log(`=== ${peerId} joined ===\n`);
    });
    room.on('stream', async (stream) => {
      const newVideo = document.createElement('video');
      newVideo.setAttribute('width', '200px');
      newVideo.setAttribute('height', '100px');
      newVideo.srcObject = stream;
      newVideo.playsInline = true;
      newVideo.autoplay = true;
      const element = document.getElementById('navivideos');
      element.insertAdjacentElement('beforeend', newVideo);
    });
  };

  useEffect(() => {
    (async () => {
      if (peer) {
        await localStreamSetting();
        //await JoinTrigger();
      }
    })();
  }, [peer]);
  return (
    <body>
      <div>
        <p id="roomId"></p>
        <video
          id="js-local-stream"
          width="400px"
          autoPlay
          muted
          ref={localStreamRef}
          playsInline
        ></video>
        <button onClick={JoinTrigger}>開始</button>
      </div>
    </body>
  );
}
