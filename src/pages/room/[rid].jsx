/* eslint-disable no-restricted-imports */
/* eslint-disable no-undef */
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { SKYWAY_API_KEY } from '../../env';
import {
  makeStyles,
  Button,
  Container,
  GridListTile,
  GridListTileBar,
  GridList,
  Card,
  TextField,
} from '@material-ui/core';
import {
  selectRoomDocument,
  selectUser,
  updateRoomDocumentWhenJoined,
  updateRoomDocumentWhenLeaved,
  checkDriver,
} from '../../database';
import { RecognitionEffect } from '../../effects/recognition';
import Layout from '../../components/layout';
import firebase from '../../plugins/firebase';
import { getCurrentUser } from '../../firebase/Authentication';

const useStyles = makeStyles({
  rootContainer: {
    marginTop: '12px',
  },
  remoteStreams: {
    backgroundColor: 'white',
    padding: '14px',
  },
  roomTitle: {
    color: 'gray',
  },
  roomFooter: {
    textAlign: 'right',
    margin: '22px',
  },
  videoContainer: {
    backgroundColor: 'gray',
  },
});

const Room = () => {
  const classes = useStyles();
  const localStreamRef = useRef(null);
  const OtherStreamRef = useRef(null);
  let Peer;
  let jsLocalStream;
  let jsRemoteStream;
  let jsOtherStream;
  let sendmessage;
  let addmessage;

  let startScreenShareTrigger;
  let stopScreenShareTrigger;
  let remoteScreens;

  if (process.browser) {
    Peer = require('skyway-js');
    jsLocalStream = document.getElementById('js-local-stream');
    jsRemoteStream = document.getElementById('js-remote-streams');
    jsOtherStream = document.getElementById('js-Other-stream');
    sendmessage = document.getElementById('send-message');
    addmessage = document.getElementById('add-message');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    startScreenShareTrigger = document.getElementById(
      'js-startScreenShare-trigger'
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    stopScreenShareTrigger = document.getElementById(
      'js-stopScreenShare-trigger'
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    remoteScreens = document.getElementById('js-remote-screen-streams');
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

  let screenShareStream;

  const localStreamOff = () => {
    // ローカルストリームを複数回オン, オフにしたとき, current = nullになるため
    if (localStreamRef.current) {
      if (localStreamRef.current.srcObject instanceof MediaStream) {
        localStreamRef.current.srcObject
          .getTracks()
          .forEach((track) => track.stop());
      }
    }
  };

  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [peer, setPeer] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const router = useRouter();
  const roomId = router.query.rid;
  console.log(roomId);

  //const [msg, setmsg] = useState('');

  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      setCurrentUser(user);
    } else {
      router.push(`/enterRoom/${roomId}`);
    }
  });

  const JoinTrigger = async () => {
    if (!peer.open) {
      return;
    }

    const user = await getCurrentUser();
    const userDocument = await selectUser(user.uid);
    await updateRoomDocumentWhenJoined(roomId, userDocument);

    const admin = await checkDriver(roomId);
    console.log(currentUser.uid);

    let msg = '';
    let vmsg = '';
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
      const gridListTitleRoot = document.createElement('li');

      gridListTitleRoot.setAttribute('id', stream.peerId);
      gridListTitleRoot.setAttribute(
        'class',
        'MuiGridListTile-tile-root makeStyles-videoContainer-2'
      );
      gridListTitleRoot.setAttribute(
        'style',
        'width: 320px; padding: 1px; background-color:gray;'
      );

      const gridListTitleVideo = document.createElement('div');
      gridListTitleVideo.setAttribute('class', 'MuiGridListTile-tile');
      gridListTitleRoot.append(gridListTitleVideo);

      const newVideo = document.createElement('video');
      newVideo.setAttribute('id', 'js-local-stream');
      newVideo.srcObject = stream;
      newVideo.playsInline = true;
      newVideo.setAttribute('width', '320px');
      newVideo.setAttribute('height', '240px');
      gridListTitleVideo.append(newVideo);

      const gridListTitleBar = document.createElement('div');
      gridListTitleBar.setAttribute(
        'class',
        'MuiGridListTileBar-root MuiGridListTileBar-titlePositionBottom'
      );

      gridListTitleVideo.append(gridListTitleBar);
      const gridListTitleWrap = document.createElement('div');
      gridListTitleWrap.setAttribute('class', 'MuiGridListTileBar-titleWrap');
      gridListTitleBar.append(gridListTitleWrap);
      const gridListTitle = document.createElement('div');
      gridListTitle.setAttribute('class', 'MuiGridListTileBar-title');

      console.log(stream.peerId);
      const user = await selectUser(stream.peerId);
      const userName = document.createTextNode(user.nickname);
      gridListTitle.append(userName);
      gridListTitleWrap.append(gridListTitle);

      jsRemoteStream.append(gridListTitleRoot);
      await newVideo.play().catch(console.error);

      //OtherStreamRef.current.srcObject = stream;
      //OtherStreamRef.current.play();
    });

    room.on('data', ({ data, src }) => {
      // Show a message sent to the room and who sent
      console.log(`${src}: ${data}\n`);
      const text = `${data}\n`;
      const add_text = document.getElementById('t_chat');
      add_text.value += text;
    });
    room.on('peerLeave', (peerId) => {
      const remoteVideoContainer = document.getElementById(`${peerId}`);

      remoteVideoContainer.children[0].children[0].srcObject
        .getTracks()
        .forEach((track) => track.stop());
      remoteVideoContainer.children[0].children[0].srcObject = null;
      remoteVideoContainer.remove();

      console.log(`=== ${peerId} left ===\n`);
    });
    room.once('close', () => {
      console.log('== You left ===\n');
      jsRemoteStream
        .querySelectorAll('li:not(.my-video)')
        .forEach((remoteVideoContainer) => {
          remoteVideoContainer.children[0].children[0].srcObject
            .getTracks()
            .forEach((track) => track.stop());
          remoteVideoContainer.children[0].children[0].srcObject = null;
          remoteVideoContainer.remove();
        });
    });

    const recognition = new RecognitionEffect();
    recognition.onFinal = (str) => {
      vmsg = str;
      room.send(vmsg);
      console.log(vmsg);
      const text = `${vmsg}\n`;
      const add_text = document.getElementById('t_chat');
      add_text.value += text;
    };

    addmessage.addEventListener('change', async (event) => {
      event.preventDefault();
      msg = event.target.value;
    });

    sendmessage.addEventListener('click', async (event) => {
      event.preventDefault();
      console.log(msg);
      console.log('送信');
      room.send(msg);
      const text = `${msg}\n`;
      const add_text = document.getElementById('t_chat');
      add_text.value += text;
    });

    let screenShareRoomInstance = await joinScreenShare();

    startScreenShareTrigger.addEventListener('click', onClickStartScreenShare, {
      once: true,
    });

    async function onClickStartScreenShare() {
      if (currentUser.uid === admin.get('adminUid')) {
        console.log('check');
        screenShareStream = await navigator.mediaDevices.getDisplayMedia({
          video: {},
        });
        screenShareRoomInstance.close();
        screenShareRoomInstance = null;
        screenShareRoomInstance = joinScreenShare(screenShareStream);
        stopScreenShareTrigger.addEventListener(
          'click',
          onClickStopScreenShare,
          {
            once: true,
          }
        );

        localStreamRef.current.srcObject = screenShareStream;
        await localStreamRef.current.play().catch(console.error);
      } else {
        alert('あなたはドライバーではありません');
        startScreenShareTrigger.addEventListener(
          'click',
          onClickStartScreenShare,
          {
            once: true,
          }
        );
      }
    }

    async function onClickStopScreenShare() {
      let screenShareStreamTrack = screenShareStream.getVideoTracks()[0];
      screenShareStreamTrack.stop();
      screenShareStream = null;
      screenShareRoomInstance.close();
      screenShareRoomInstance = null;
      screenShareRoomInstance = joinScreenShare();
      startScreenShareTrigger.addEventListener(
        'click',
        onClickStartScreenShare,
        { once: true }
      );

      await localStreamSetting();
    }

    function joinScreenShare(screenShareStream = null) {
      const screenShareRoomId = roomId.value + '_screen';
      // eslint-disable-next-line no-redeclare
      let screenShareRoom = null;
      if (screenShareStream === null) {
        screenShareRoom = peer.joinRoom(screenShareRoomId, {
          mode: 'mesh',
        });
      } else {
        screenShareRoom = peer.joinRoom(screenShareRoomId, {
          mode: 'mesh',
          stream: screenShareStream,
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      screenShareRoom.once('open', () => {});
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      screenShareRoom.on('peerJoin', (peerId) => {});

      // Render remote stream for new peer join in the room
      screenShareRoom.on('stream', async (stream) => {
        const newVideo = document.createElement('video');
        newVideo.srcObject = stream;
        newVideo.playsInline = true;
        // mark peerId to find it later at peerLeave event
        newVideo.setAttribute('data-peer-id-screen', stream.peerId);
        remoteScreens.append(newVideo);
        await newVideo.play().catch(console.error);
      });

      // for closing room members
      screenShareRoom.on('peerLeave', (peerId) => {
        const screenShareVideo = remoteScreens.querySelector(
          `[data-peer-id-screen="${peerId}"]`
        );
        screenShareVideo.srcObject.getTracks().forEach((track) => track.stop());
        screenShareVideo.srcObject = null;
        screenShareVideo.remove();
      });

      // for closing myself
      screenShareRoom.once('close', () => {
        Array.from(remoteScreens.children).forEach((screenShareVideo) => {
          screenShareVideo.srcObject
            .getTracks()
            .forEach((track) => track.stop());
          screenShareVideo.srcObject = null;
          screenShareVideo.remove();
        });
      });

      return screenShareRoom;
    }
  };

  const setUpUsernameInput = async () => {
    const user = await getCurrentUser();
    const userDocument = await selectUser(user.uid);
    setUserName(userDocument.nickname);
  };

  const setUpRoomInfo = async () => {
    const roomDoc = await selectRoomDocument(roomId);
    const rd = await roomDoc.get();
    console.log(rd.data().name);
    setRoomName(rd.data().name);
  };

  useEffect(() => {
    (async () => {
      if (currentUser) {
        await setUpUsernameInput();
        await setUpRoomInfo();
        setPeer(new Peer(currentUser.uid, { key: SKYWAY_API_KEY }));
      }
    })();
  }, [currentUser]);

  useEffect(() => {
    (async () => {
      if (peer && roomId) {
        await localStreamSetting();
        await JoinTrigger();
      }
    })();
  }, [roomId, peer]);
  return (
    <Layout>
      <Card>
        <GridList
          cellHeight="90vh"
          id="js-remote-streams"
          className={classes.remoteStreams}
          cols={2}
        ></GridList>
        <div>
          <p id="roomId"></p>
          <video
            id="js-local-stream"
            width="320"
            height="240"
            autoPlay
            muted
            ref={localStreamRef}
            playsInline
          ></video>
          <div className="remote-streams" id="js-remote-screen-streams"></div>
        </div>
        <TextField id="add-message" />
        <Button variant="contained" id="send-message" color="secondary">
          sousin
        </Button>
        <Button
          variant="contained"
          id="js-startScreenShare-trigger"
          color="secondary"
        >
          画面共有開始
        </Button>
        <Button
          variant="contained"
          id="js-stopScreenShare-trigger"
          color="secondary"
        >
          画面共有停止
        </Button>
        <textarea readOnly id="t_chat" rows="10" cols="45"></textarea>
      </Card>
    </Layout>
  );
};
export default Room;
