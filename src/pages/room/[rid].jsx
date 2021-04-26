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
  let changemedia;
  let flag;

  if (process.browser) {
    Peer = require('skyway-js');
    jsLocalStream = document.getElementById('js-local-stream');
    jsRemoteStream = document.getElementById('js-remote-streams');
    jsOtherStream = document.getElementById('js-Other-stream');
    sendmessage = document.getElementById('send-message');
    addmessage = document.getElementById('add-message');
    changemedia = document.getElementById('change-media');
  }
  const localStreamSetting = async () => {
    localStreamRef.current.srcObject = await navigator.mediaDevices.getUserMedia(
      {
        audio: true,
        video: true,
      }
    );
    await localStreamRef.current.play();
    flag = 0;
  };

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
        'width: 50%; padding: 1px; background-color:gray;'
      );

      const gridListTitleVideo = document.createElement('div');
      gridListTitleVideo.setAttribute('class', 'MuiGridListTile-tile');
      gridListTitleRoot.append(gridListTitleVideo);

      const newVideo = document.createElement('video');
      newVideo.setAttribute('id', 'js-local-stream');
      newVideo.srcObject = stream;
      newVideo.playsInline = true;
      newVideo.setAttribute('width', '100%');
      newVideo.setAttribute('height', '100%');
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

      jsRemoteStream.append(gridListTitleRoot);
      await newVideo.play().catch(console.error);

      OtherStreamRef.current.srcObject = stream;
      OtherStreamRef.current.play();
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

    changemedia.addEventListener('click', async (event) => {
      event.preventDefault();
      await ScreenStreamSetting();
      room.replaceStream(localStreamRef.current.srcObject);
    });
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

  const ScreenStreamSetting = async () => {
    if (flag == 0) {
      localStreamRef.current.srcObject = await navigator.mediaDevices.getDisplayMedia(
        {
          audio: true,
          video: true,
        }
      );
      await localStreamRef.current.play();
      flag = 1;
    } else {
      localStreamSetting();
    }
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
            width="400px"
            autoPlay
            muted
            ref={localStreamRef}
            playsInline
          ></video>
          <video
            id="js-Other-stream"
            width="400px"
            autoPlay
            muted
            ref={OtherStreamRef}
            playsInline
          ></video>
        </div>
        <TextField id="add-message" />
        <Button variant="contained" id="send-message" color="secondary">
          sousin
        </Button>
        <Button variant="contained" id="change-media" color="secondary">
          変更
        </Button>
        <textarea readOnly id="t_chat" rows="10" cols="45"></textarea>
      </Card>
    </Layout>
  );
};
export default Room;
