# sema-engine

![Node.js CI](https://github.com/frantic0/sema-engine/workflows/Node.js%20CI/badge.svg)
![version](https://img.shields.io/badge/version-0.0.35-red)
[![stability-experimental](https://img.shields.io/badge/stability-experimental-orange.svg)](https://github.com/emersion/stability-badges#experimental)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-yellow.svg)](https://github.com/frantic0/sema-engine/blob/main)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fsema.codes)](https://frantic0.github.io/sema-engine/)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/frantic0/sema-engine/blob/main/LICENSE)

*sema-engine* is a Javascript library that provides a high-performance audio engine for modern Web applications, with an easy-to-use API. It was extracted from [sema](https://github.com/mimic-sussex/sema), an app developed with @[chriskiefer](https://github.com/chriskiefer) and @[thormagnusson](https://github.com/thormagnusson), and refactored for project MIMIC.

*sema-engine* builds upon the following components:

* the Maximilian DSP C++ library – from which *sema-engine* consumes DSP objects, as a git submodule

* the Web Audio API Audio Worklet – packs a bespoke Audio Worklet node (src/engine.js) and processor (maxi-processor), which loads Maximilian DSP objects and dynamic program specifications

* the Nearley compiler – generates parsers from an EBNF grammar specification

The *sema-engine* library exposes ES and UMD modules (works on the browser, with modern native JS modules and older JS module formats—amd, cjs for nodejs applications—think electron!).

*sema-engine* uses Github Actions workflows for build automation and continuous integration. The development builds propagate source maps (.map files)—so you can have modern debugging features like using breakpoints in the context of the client application. The production build ships all formats optimised and minified.


## Usage

The *sema-engine* is published in the Node Package Manager (NPM) registry. If you are developing a Web application in a modern environment, and using a bundler such as *Webpack* or *Rollup*, you can easily add *sema-engine* as a dependency,

```
npm install sema-engine
```

For an advanced use, check how *sema-engine* is integrated in [Sema](https://github.com/mimic-sussex/sema), a full-fledged application from which *sema-engine* was extracted.


You can use also use the *sema-engine* library modules in an a HTML file using inline `<script>` tags (check the published [example](https://frantic0.github.io/sema-engine/) which is output by the development build).

```
<script type="module">

    import {
      Engine,
      compile,
      Learner,
      getBlock
    } from "./sema-engine.mjs";

</script>
```
Note the that the script tag for the main module `sema-engine.mjs` has `type = module`.

When initialising *sema-engine*, you need to pass the `audioWorkletURL` URL which points to where package dependencies – e.g. maxi-processor.js and maximilian.wasmmodule.js (check the `dist/` folder) – should be served from.

```
  let engine,
      analyser = 0,
      compiledParser = {},
      grammarCompilationErrors = "",
      livecodeParseErrors,
      livecodeParseTree,
      dspCode,
      learner
      ;

  const $ = (elemId, callback) =>
    document.getElementById(elemId).addEventListener("click", callback);

  $("playButton", "click", () => {
    const audioWorkletURL = origin + "/maxi-processor.js";
    engine = new Engine();
    engine.init("maxi-processor", audioWorkletURL);
    engine.play();
  })

  $("stopButton", () => engine.stop());
  $("plusButton", () => engine.more());
  $("minusButton", () => engine.less());

  $("loadSamplesButton", () => {
    engine.loadSample("crebit2.ogg", "./audio/crebit2.ogg");
    engine.loadSample("kick1.wav", "./audio/kick1.wav");
    engine.loadSample("snare1.wav", "./audio/snare1.wav");
  });

  $("learnerButton", "click", async () => {
    learner = new Learner();
    if(engine){
      engine.addEventListener('onSharedBuffer', e => learner.createSharedBuffer(e) ); // Engine's SAB emissions subscribed by Learner
      learner.addEventListener('onSharedBuffer', e => engine.pushSharedBuffer(e) );  // Learner's SAB emissions subscribed by Engine
    }
    await learner.init(document.location.origin); // when Learner initializes
  });
</script>
```

To compile the livecode, you need to do it against its grammar language specification, with the `compile` function. Only then you can inject the resulting code in the engine and evaluate it.

For the JS code, we provide `getBlock`, an utility function that pulls code from an editor block. Blocks in a Codemirror editor instance are delimited by `____` (3 or more underscores).

```
  const evalLiveCode = () => {
    if(engine){
      try{
        const { errors, dspCode } = compile( editorGrammar.getValue(), editorLivecode.getValue() );
        if(dspCode){
          console.info(editorLivecode.getValue());
          engine.eval(dspCode);
        }
      } catch (err) {
        console.error("ERROR: Failed to compile and eval: ", err);
      }
    }
    else throw new Error('ERROR: Engine not initialized. Please press Start Engine first.')
  }

  const evalJs = async () => {
    if(learner && editorJS){
      const code = getBlock(editorJS);
      console.info(code);
      learner.eval(code);
    }
    else throw new Error('ERROR: Learner not initialized. Please press Create Learner first.')
  }
```

## Prerequisites

The emscripten SDK is required, https://emscripten.org/docs/getting_started/downloads.html

## Build

If you are cloning this library for the first time:

1. Initialise the Maximilian submodule
```
git submodule update --init --recursive
```

2. Install dependencies
```
npm i
```

3. Build the Maximilian native JS and WebAssembly modules
```
make
```

4. Build the sema-engine library into UMD and ES modules
```
npm run build
```

5. Test the sema-engine library in a local example
```
npm run dev
```

To update submodule if there are any upgrades
```
git submodule update --remote --merge
```


## Tests and Examples

The *sema-engine* library uses Mocha for unit and integration tests.

The development build outputs the example above, which you can use to learn and test out how to work with the engine.


## Documentation

The *sema-engine* has small API surface that you can find more about on this project's [wiki](https://github.com/frantic0/sema-engine/wiki).



## Contributing

Pull requests are wellcome but please observe the [Contributing](https://github.com/frantic0/sema-engine/blob/main/CONTRIBUTING.md) guidelines.

## Related Publications

Bernardo, F., Kiefer, C., Magnusson, T. (2020). A Signal Engine for a Live Code Language Ecosystem. Journal of Audio Engineering Society, Vol. 68, No. 1, October, DOI: [https://doi.org/10.17743/jaes.2020.0016](https://doi.org/10.17743/jaes.2020.0016)
