// import Module from './maximilian.wasmmodule.js'; //NOTE:FB We need this import here for webpack to emit maximilian.wasmmodule.js
// import Open303 from './open303.wasmmodule.js'; //NOTE:FB We need this import here for webpack to emit maximilian.wasmmodule.js
// import CustomProcessor from './maxi-processor.js';
import RingBuffer from './ringbuf.js'; //thanks padenot
import {
  loadSampleToArray
} from './maximilian.util.js';
// import {
//   kuramotoNetClock
// } from './interfaces/clockInterface.js';
// import {
//   PubSub
// } from './messaging/pubSub.js';
// import {
//   PeerStreaming
// } from '../interfaces/peerStreaming.js';
// import {
//   copyToPasteBuffer
// } from '../utils/pasteBuffer.js';


/**
 * The CustomMaxiNode is a class that extends AudioWorkletNode
 * to hold an Custom Audio Worklet Processor and connect to Web Audio graph
 * @class CustomMaxiNode
 * @extends AudioWorkletNode
 */
// if(true){
class CustomMaxiNode extends AudioWorkletNode {
  constructor(audioContext, processorName) {
    // super(audioContext, processorName);
    console.log();
    let options = {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [audioContext.destination.maxChannelCount]
    };
    super(audioContext, processorName, options);
  }
}
// }

/**
 * The AudioEngine is a singleton class that encapsulates the AudioContext
 * and all WASM and Maximilian -powered Audio Worklet Processor
 * @class AudioEngine
 */
class AudioEngine {

  /**
   * @constructor
   */
  constructor() {
    if (AudioEngine.instance) {
      return AudioEngine.instance; // Singleton pattern
    }
    AudioEngine.instance = this;

    // AudioContext needs lazy loading to workaround the Chrome warning
    // Audio Engine first play() call, triggered by user, prevents the warning
    // by setting this.audioContext = new AudioContext();
    this.audioContext;
    this.audioWorkletProcessorName = 'maxi-processor';
    this.audioWorkletUrl = document.location.origin + '/maxi-processor.js';
    this.audioWorkletNode;
    this.samplesLoaded = false;



    // Hash of on-demand analysers (e.g. spectrogram, oscilloscope)
    // NOTE: analysers from localStorage are loaded from local Storage before user-started audioContext init
    this.analysers = {};

    //shared array buffers for sharing client side data to the audio engine- e.g. mouse coords
    this.sharedArrayBuffers = {};


    // MOVE THIS TO AN UP LAYER IN SEMA

    // Sema's Publish-Subscribe pattern object with 'lowercase-lowercase' format convention for subscription topic
    // this.messaging = new PubSub();
    // this.messaging.subscribe('eval-dsp', e => this.evalDSP(e));
    // this.messaging.subscribe('stop-audio', e => this.stop());
    // this.messaging.subscribe('load-sample', (name, url) =>
    //   this.loadSample(name, url)
    // );
    // this.messaging.subscribe('model-output-data', e =>
    //   this.onMessagingEventHandler(e)
    // );
    // this.messaging.subscribe('clock-phase', e =>
    //   this.onMessagingEventHandler(e)
    // );
    // this.messaging.subscribe('model-send-buffer', e =>
    //   this.onMessagingEventHandler(e)
    // );
    // this.messaging.subscribe('add-engine-analyser', e =>
    //   this.createAnalyser(e)
    // );
    // this.messaging.subscribe('remove-engine-analyser', e =>
    //   this.removeAnalyser(e)
    // );

    // this.messaging.subscribe('mouse-xy', e => {
    //   if (this.sharedArrayBuffers.mxy) {
    //     this.sharedArrayBuffers.mxy.rb.push(e);
    //   }
    // });
    // this.messaging.subscribe('osc', e => console.log(`DEBUG:AudioEngine:OSC: ${e}`));


    //temporarily disabled for now
    // this.kuraClock = new kuramotoNetClock();

    //temporarily disabled for now
    // this.peerNet = new PeerStreaming();

    //the message has incoming data from other peers
    // this.messaging.subscribe('peermsg', (e) => {
    //   e.ttype = 'NET';
    //   e.peermsg = 1;
    //   this.onMessagingEventHandler(e);
    // });

    // this.messaging.subscribe('peerinfo-request', (e) => {
    //   console.log(this.peerNet.peerID);
    //   copyToPasteBuffer(this.peerNet.peerID);
    // });



  }

  /**
   * Handler of audio worklet processor events
   * @onProcessorMessageEventHandler
   */
  onProcessorMessageEventHandler(event) {
    if (event != undefined && event.data != undefined) {
      // console.log('DEBUG:AudioEngine:processorMessageHandler:');
      // console.log(event);
      if (event.data.rq != undefined && event.data.rq === 'send') {
        switch (event.data.ttype) {
          case 'ML':
            // Stream generated by 'toJS' live code instruction — e.g. {10,0,{1}sin}toJS;
            // publishes to model/JS editor, which posts to ml.worker
            this.messaging.publish('model-input-data', {
              type: 'model-input-data',
              value: event.data.value,
              ch: event.data.ch
            });
            break;
          case 'NET':
            this.peerNet.send(event.data.ch[0], event.data.value, event.data.ch[1]);
            break;
        }
      } else if (event.data.rq && event.data.rq === 'buf') {
        console.log('buf', event.data);
        switch (event.data.ttype) {
          case 'ML':
            this.messaging.publish('model-input-buffer', {
              type: 'model-input-buffer',
              value: event.data.value,
              channelID: event.data.channelID, //channel ID
              blocksize: event.data.blocksize
            });
            break;
        }
      }
      else if (event.data === 'giveMeSomeSamples') {} else if (event.data.phase != undefined) {
        // console.log('DEBUG:AudioEngine:phase:');
        // console.log(event.data.phase);
        // this.kuraClock.broadcastPhase(event.data.phase); // TODO Refactor p to phase
      }
      // else if (event.data.rq != undefined && event.data.rq === 'receive') {
      //   switch (event.data.ttype) {
      //     case 'ML':
      //       // Stream generated by 'fromJS' live code instruction – e.g. {{10,1}fromJS}saw
      //       // publishes to model/JS editor, which posts to ml.worker
      //       this.messaging.publish('model-output-data-request', {
      //         type: 'model-output-data-request',
      //         value: event.data.value,
      //         channel: event.data.ch
      //       });
      //       break;
      //     case 'NET':
      //       break;
      //   }
      // }
    }
  }

  /**
   * Handler of the Pub/Sub message events
   * whose topics are subscribed to in the audio engine constructor
   * @onMessagingEventHandler
   */
  onMessagingEventHandler(event) {
    if (event !== undefined) {
      // Receive notification from 'model-output-data' topic
      console.log('DEBUG:AudioEngine:onMessagingEventHandler:');
      console.log(event);
      this.audioWorkletNode.port.postMessage(event);
    }
  }

  /**
   * Creates a WAAPI analyser node
   * @todo configuration object as argumen
   * @createAnalyser
   */
  createAnalyser(event) {
    // If Analyser creation happens after AudioContext intialization, create and connect WAAPI analyser
    if (this.audioContext !== undefined && event !== undefined) {

      let analyser = this.audioContext.createAnalyser();
      analyser.smoothingTimeConstant = 0.25;
      analyser.fftSize = 256; // default 2048;
      analyser.minDecibels = -90; // default
      analyser.maxDecibels = -0; // default -10; max 0
      this.connectAnalyser(analyser, event.id); // @todo Move out

      // Other if AudioContext is NOT created yet (after app load, before splashScreen click)
    } else if (this.audioContext === undefined) {
      this.analysers[event.id] = {};
    }
  }

  /**
   * Polls data from connected WAAPI analyser return structured object with data and time data in arrays
   * @param {*} analyser
   */

  pollAnalyserData(analyser) {
    if (analyser !== undefined) {
      const timeDataArray = new Uint8Array(analyser.fftSize); // Uint8Array should be the same length as the fftSize
      const frequencyDataArray = new Uint8Array(analyser.fftSize);

      analyser.getByteTimeDomainData(timeDataArray);
      analyser.getByteFrequencyData(frequencyDataArray);

      return {
        smoothingTimeConstant: analyser.smoothingTimeConstant,
        fftSize: analyser.fftSize,
        frequencyDataArray: frequencyDataArray,
        timeDataArray: timeDataArray
      };
    }
  }

  /**
   * Connects WAAPI analyser node to the main audio worklet for visualisation.
   * @connectAnalyser
   */
  connectAnalyser(analyser, name) {
    if (this.audioWorkletNode !== undefined) {
      this.audioWorkletNode.connect(analyser);

      let analyserFrameId;
      let analyserData;

      /**
       * Creates requestAnimationFrame loop for polling data and publishing
       * Returns Analyser Frame ID for adding to Analysers hash and cancelling animation frame
       */
      const analyserPollingLoop = () => {

        analyserData = this.pollAnalyserData(analyser);
        this.messaging.publish('analyser-data', analyserData);
        let analyserFrameId = requestAnimationFrame(analyserPollingLoop);
        this.analysers[name] = {
          analyser,
          analyserFrameId
        };
        return analyserFrameId;
      };

      // analyserFrameId = analyserPollingLoop;

      analyserPollingLoop();
    }
  }

  connectAnalysers() {
    Object.keys(this.analysers).map(id => this.createAnalyser({
      id
    }));
  }

  /**
   * Removes a WAAPI analyser node, disconnects graph, cancels animation frame, deletes from hash
   * @removeAnalyser
   */
  removeAnalyser(event) {
    if (this.audioContext !== undefined && this.audioWorkletNode !== undefined) {
      let analyser = this.analysers[event.id];
      if (analyser !== undefined) {
        cancelAnimationFrame(this.analysers[event.id].analyserFrameId);
        delete this.analysers[event.id];
        // this.audioWorkletNode.disconnect(analyser);
      }
    }
  }

  //make a shared array buffer for communicating with the audio engine
  createSharedArrayBuffer(chID, ttype, blocksize) {
    let sab = RingBuffer.getStorageForCapacity(32 * blocksize, Float64Array);
    let ringbuf = new RingBuffer(sab, Float64Array);

    this.audioWorkletNode.port.postMessage({
      func: 'sab',
      value: sab,
      ttype: ttype,
      channelID: chID,
      blocksize: blocksize
    });


    this.sharedArrayBuffers[chID] = {
      sab: sab,
      rb: ringbuf
    };

    console.log(this.sharedArrayBuffers);
  }


  /**
   * Initialises audio context and sets worklet processor code
   * @play
   */
  async init(numClockPeers) {
    if (this.audioContext === undefined) {
      this.audioContext = new AudioContext({
				// create audio context with latency optimally configured for playback
				latencyHint: 'playback',
				// latencyHint: 32/44100,  //this doesn't work below 512 on chrome (?)
				// sampleRate: 44100
			});

			this.audioContext.destination.channelInterpretation = 'discrete';
			this.audioContext.destination.channelCountMode = 'explicit';
			this.audioContext.destination.channelCount = this.audioContext.destination.maxChannelCount;
			// console.log(this.audioContext.destination);

			await this.loadWorkletProcessorCode();

			// Connect the worklet node to the audio graph
			this.audioWorkletNode.connect(this.audioContext.destination);

			// this.audioWorkletNode.channelInterpretation = 'discrete';
			// this.audioWorkletNode.channelCountMode = 'explicit';
			// this.audioWorkletNode.channelCount = this.audioContext.destination.maxChannelCount;

			// this.connectMediaStream();

			// this.connectAnalysers(); // Connect Analysers loaded from the store

			// this.loadImportedSamples();

			// No need to inject the callback here, messaging is built in KuraClock
			// this.kuraClock = new kuramotoNetClock((phase, idx) => {
			//   // console.log( `DEBUG:AudioEngine:sendPeersMyClockPhase:phase:${phase}:id:${idx}`);
			//   // This requires an initialised audio worklet
			//   this.audioWorkletNode.port.postMessage({ phase: phase, i: idx });
			// });

			//temporarily disabled
			// if (this.kuraClock.connected()) {
			// 	this.kuraClock.queryPeers(async numClockPeers => {
			// 		console.log(`DEBUG:AudioEngine:init:numClockPeers: ${numClockPeers}`);
			// 	});
			// }

			this.createSharedArrayBuffer('mxy', 'mouseXY', 2);
		}
  }

  /**
   * Initialises audio context and sets worklet processor code
   * or re-starts audio playback by stopping and running the latest Audio Worklet Processor code
   * @play
   */
  play() {
    if (this.audioContext !== undefined) {
      if (this.audioContext.state !== 'suspended') {
        this.stop();
        return false;
      } else {
        this.audioContext.resume();
        return true;
      }
    }
  }

  /**
   * Suspends AudioContext (Pause)
   * @stop
   */
  stop() {
    if (this.audioWorkletNode !== undefined) {
      this.audioContext.suspend();
    }
  }

  /**
   * Stops audio by disconnecting AudioNode with AudioWorkletProcessor code
   * from Web Audio graph TODO Investigate when it is best to just STOP the graph exectution
   * @stop
   */
  stopAndRelease() {
    if (this.audioWorkletNode !== undefined) {
      this.audioWorkletNode.disconnect(this.audioContext.destination);
      this.audioWorkletNode = undefined;
    }
  }

  more(gain) {
    if (this.audioWorkletNode !== undefined) {
      const gainParam = this.audioWorkletNode.parameters.get(gain);
      gainParam.value += 0.5;
      console.log(gain + ': ' + gainParam.value); // DEBUG
      return true;
    } else return false;
  }

  less(gain) {
    if (this.audioWorkletNode !== undefined) {
      const gainParam = this.audioWorkletNode.parameters.get(gain);
      gainParam.value -= 0.5;
      console.log(gain + ': ' + gainParam.value); // DEBUG
      return true;
    } else return false;
  }

  eval(dspFunction) {

    // console.log('DEBUG:AudioEngine:evalDSP:');
    // console.log(dspFunction);

    if (this.audioWorkletNode !== undefined) {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      this.audioWorkletNode.port.postMessage({
        eval: 1,
        setup: dspFunction.setup,
        loop: dspFunction.loop
      });
      return true;
    } else return false;
  }

  sendClockPhase(phase, idx) {
    if (this.audioWorkletNode !== undefined) {
      this.audioWorkletNode.port.postMessage({
        phase: phase,
        i: idx
      });
    }
  }

  onAudioInputInit(stream) {
    // console.log('DEBUG:AudioEngine: Audio Input init');
    let mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
    mediaStreamSource.connect(this.audioWorkletNode);
  }

  onAudioInputFail(error) {
    console.log(
      `DEBUG:AudioEngine:AudioInputFail: ${error.message} ${error.name}`
    );
  }

  /**
   * Sets up an AudioIn WAAPI sub-graph
   * @connectMediaStreamSourceInput
   */
  async connectMediaStream() {
    const constraints = (window.constraints = {
      audio: true,
      video: false
    });

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(s => this.onAudioInputInit(s))
      .catch(this.onAudioInputFail);
  }

  /**
   * Loads audioWorklet processor code into a worklet,
   * setups up all handlers (errors, async messaging, etc),
   * connects the worklet processor to the WAAPI graph
   */
  async loadWorkletProcessorCode() {
    if (this.audioContext !== undefined) {
      try {
        await this.audioContext.audioWorklet.addModule(this.audioWorkletUrl);
      } catch (err) {
        console.error(
          'ERROR: AudioEngine:loadWorkletProcessorCode: AudioWorklet not supported in this browser: ',
          err.message
        );
        return false;
      }
      try {
        // Custom node constructor with required parameters
        this.audioWorkletNode = new CustomMaxiNode(this.audioContext, this.audioWorkletProcessorName);

        // All possible error event handlers subscribed
        this.audioWorkletNode.onprocessorerror = event => {
          // Errors from the processor
          console.log(
            `DEBUG:AudioEngine:loadWorkletProcessorCode: MaxiProcessor Error detected`
          );
        };

        this.audioWorkletNode.port.onmessageerror = event => {
          //  error from the processor port
          console.log(
            `DEBUG:AudioEngine:loadWorkletProcessorCode: Error message from port: ` +
            event.data
          );
        };

        // State changes in the audio worklet processor
        this.audioWorkletNode.onprocessorstatechange = event => {
          console.log(
            `DEBUG:AudioEngine:loadWorkletProcessorCode: MaxiProcessor state change detected: ` +
            audioWorkletNode.processorState
          );
        };

        // Worklet Processor message handler
        this.audioWorkletNode.port.onmessage = event => {
          this.onProcessorMessageEventHandler(event);
        };

        return true;

      } catch (err) {
        console.error(
          'ERROR: AudioEngine:loadWorkletProcessorCode: Custom AudioWorklet node creation: ',
          err.message
        );
        return false;
      }
    } else {
      return false;
    }
  }

  getSamplesNames() {
    const r = require.context('../../assets/samples', false, /\.wav$/);

    // return an array list of filenames (with extension)
    const importAll = r => r.keys().map(file => file.match(/[^\/]+$/)[0]);

    return importAll(r);
  }

  loadSample(objectName, url) {
    if (this.audioContext !== undefined) {
      loadSampleToArray(
        this.audioContext,
        objectName,
        url,
        this.audioWorkletNode
      );
    } else throw 'Audio Context is not initialised!';
  }

  lazyLoadSample(sampleName) {
    import( /* webpackMode: 'lazy' */ `../../assets/samples/${sampleName}`)
      .then(() => this.loadSample(sampleName, `/samples/${sampleName}`))
      .catch(err => console.error(`DEBUG:AudioEngine:lazyLoadSample: ` + err));
  }

  loadImportedSamples() {
    let samplesNames = this.getSamplesNames();
    // console.log('DEBUG:AudioEngine:getSamplesNames: ' + samplesNames);
    samplesNames.forEach(sampleName => {
      this.lazyLoadSample(sampleName);
    });
  }

  // NOTE:FB Test code should be segregated from production code into its own fixture.
  // Otherwise, it becomes bloated, difficult to read and reason about.
  // messageHandler(data) {
  // 	if (data == 'dspStart') {
  // 		this.ts = window.performance.now();
  // 	}
  // 	if (data == 'dspEnd') {
  // 		this.ts = window.performance.now() - this.ts;
  // 		this.dspTime = this.dspTime * 0.9 + this.ts * 0.1; //time for 128 sample buffer
  // 		this.onNewDSPLoadValue((this.dspTime / 2.90249433106576) * 100);
  // 	}
  // 	if (data == 'evalEnd') {
  // 		let evalts = window.performance.now();
  // 		this.onEvalTimestamp(evalts);
  // 	} else if (data == 'evalEnd') {
  // 		let evalts = window.performance.now();
  // 		this.onEvalTimestamp(evalts);
  // 	} else if (data == 'giveMeSomeSamples') {
  // 		// this.msgHandler('giveMeSomeSamples');    	// NOTE:FB Untangling the previous msgHandler hack from the audio engine
  // 	} else {
  // 		this.msgHandler(data);
  // 	}
  // }
}

export { AudioEngine };