const JsSIP = require("JsSIP");
JsSIP.debug.enable("JsSIP:*");

let [phone, call] = [null, null];
const bc = new BroadcastChannel("call-info");

window.addEventListener("DOMContentLoaded", () => {
  localStorage.setItem("is_popup_active", "true");
});

window.addEventListener("beforeunload", () => {
  localStorage.clear();
});

// ________________________________________________________________

let [sip, password, server_address, port] = [
  "1000",
  "1000_client",
  "18.212.171.223",
  "7443/ws",
];

const call_options = {
  eventHandlers: {
    progress: (e) => {
      console.log("call is in progress");
    },
    failed: (e) => {
      console.log("call failed with cause: " + e.data);
    },
    ended: (e) => {
      console.log("call ended with cause: " + e.data);
    },
    confirmed: (e) => {
      console.log("call confirmed");
    },
  },
  pcConfig: {
    rtcpMuxPolicy: "negotiate",
    hackStripTcp: true,
    iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    iceTransportPolicy: "all",
  },
  mediaConstraints: {
    audio: true,
    video: false,
  },
  rtcOfferConstraints: {
    offerToReceiveAudio: true,
    offerToReceiveVideo: false,
  },
};

const configuration = {
  sockets: [
    new JsSIP.WebSocketInterface("wss://" + server_address + ":" + port),
  ],
  uri: "sip:" + sip + "@" + server_address,
  authorization_user: sip,
  password: password,
  registrar_server: "sip:" + server_address,
  no_answer_timeout: 20,
  session_timers: false,
  register: true,
  trace_sip: true,
  connection_recovery_max_interval: 30,
  connection_recovery_min_interval: 2,
};

// ________________________________________________________________

// Debugging purpose :)
const redAlert = () => {
  document.querySelector("body").innerHTML = "";
  document.querySelector("body").style.backgroundColor = "darkred";
};

const connect = (callback) => {
  phone = new JsSIP.UA(configuration);
  phone.start();

  phone.on("connected", (e) => {
    console.log("connected");

    addEventListeners();
    callback();
  });

  phone.on("disconnected", (e) => {
    console.log("disconnected");
  });

  phone.on("newMessage", (e) => {
    e.data.message.accept();
    console.log(e);
  });
};

// ________________________________________________________________

const addEventListeners = () => {
  phone.on("newRTCSession", (event) => {
    call = event.session;
    console.log("Direction: ", call.direction);

    // call.on("sdp", (e) => {
    //   console.log("call sdp: ", e.sdp);
    // });
    // call.on("accepted", (e) => {
    //   console.log("call accepted: ", e);
    // });
    // call.on("progress", function (e) {
    //   console.log("call is in progress: ", e);
    // });
    // call.on("confirmed", (e) => {
    //   console.log("confirmed by", e.originator);
    // });
    // call.on("ended", (e) => {
    //   console.log("Call ended: ", e);
    //   terminate();
    // });
    // call.on("failed", (e) => {
    //   console.log("Call failed: ", e);
    //   terminate();
    // });
    // call.on("peerconnection", (e) => {
    //   console.log("call peerconnection: ", e);
    // });
  });
};
// ________________________________________________________________

const addStreams = () => {
  call.connection.addEventListener("addstream", function (event) {
    incomingCallAudio.pause();

    remoteAudio.srcObject = event.stream;

    localView.srcObject = call.connection.getLocalStreams()[0];
    remoteView.srcObject = call.connection.getRemoteStreams()[0];
  });
};

let incomingCallAudio = new window.Audio(
  "http://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/bonus.wav"
);
incomingCallAudio.loop = true;

let remoteAudio = new window.Audio();
remoteAudio.autoplay = true;

const localView = document.getElementById("localMedia");
const remoteView = document.getElementById("remoteMedia");

// ________________________________________________________________

const callNumber = (call_to) => {
  call_to = "4153260912";

  // for Avaya services through our asterisk server
  call_to = "125311" + call_to;

  phone.call(call_to, call_options);
  addStreams();
};

const answer = () => {
  if (call) {
    call.answer(call_options);
  }
};

const terminate = () => {
  if (call) {
    call.terminate();
  }
  call = null;
};

// ________________________________________________________________

setTimeout(() => {
  connect(() => {
    document.querySelector("h2").textContent = "CONNECTED";
    document.querySelector(".ripple").remove();
    bc.postMessage({ header: "button_state", value: true });
  });
  console.log("connected");
}, 1000);

bc.onmessage = (event) => {
  if (event.data.header === "call") {
    console.log("RECEIVED CALL REQUEST");
    callNumber(event.data.value);
  } else if (event.data.header === "hangup") {
    console.log("RECEIVED HANGUP REQUEST");
    terminate();
  } else {
    console.log("UNKNOWN HEADER: " + event.data.header);
  }
};
