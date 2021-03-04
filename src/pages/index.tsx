import React, { useEffect } from 'react';
import Peer from 'skyway-js';
const peer = new Peer({ key: '00403e5e-fdf0-4ad6-bdf9-88c71127156f' });
export default function Home() {
  let localStream: MediaStream | undefined;

  peer.on('open', () => {
    document.getElementById('my-id').textContent = peer.id;
  });
  useEffect(() => {
    // カメラ映像取得
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        // 成功時にvideo要素にカメラ映像をセットし、再生
        const videoElm = document.getElementById('my-video');
        videoElm.srcObject = stream;
        videoElm.play();
        // 着信時に相手にカメラ映像を返せるように、グローバル変数に保存しておく
        localStream = stream;
      })
      .catch((error) => {
        // 失敗時にはエラーログを出力
        console.error('mediaDevice.getUserMedia() error:', error);
        return;
      });
    document.getElementById('make-call').onclick = () => {
      const theirID = document.getElementById('their-id').value;
      const mediaConnection = peer.call(theirID, localStream);
      setEventListener(mediaConnection);
    };
    peer.on('call', (mediaConnection) => {
      mediaConnection.answer(localStream);
      setEventListener(mediaConnection);
    });
  });

  // イベントリスナを設置する関数
  const setEventListener = (mediaConnection) => {
    mediaConnection.on('stream', (stream) => {
      // video要素にカメラ映像をセットして再生
      const videoElm = document.getElementById('their-video');
      videoElm.srcObject = stream;
      videoElm.play();
    });
  };
  return (
    <body>
      <video id="my-video" width="400px" autoPlay muted playsInline></video>
      <p id="my-id"></p>
      <textarea id="their-id"></textarea>
      <button id="make-call">発信</button>
      <video id="their-video" width="400px" autoPlay muted playsInline></video>
    </body>
  );
}
