import nearley from 'nearley';
import moo from 'moo';
import semaa from './sema.js';
// import cloneDeep from "lodash.cloneDeep";


function getParserModuleExports(source) {
  let mooo = moo;
  let sema = semaa;
  sema.num("3");
	let module = { exports: '' };
	eval(source);
	return module.exports;
}

const clone = (a) => JSON.parse(JSON.stringify(a))


onmessage = function(message) {
  if (
		message.data !== undefined &&
		message.data.length != 0 &&
    message.data.type === 'parse'
		// message.data.type !== "webpackWarnings" &&  // [TODO:FB] This worker is being bombarded with global scope messages! Investigate to improve performance
		// message.data.type !== "webpackClose"
	) {
		try {
			let parserOutputs = [];
			const { liveCodeSource, parserSource } = message.data;
			let parser = new nearley.Parser(getParserModuleExports(parserSource));

      parser.feed(liveCodeSource);
			parserOutputs = JSON.parse(JSON.stringify(parser.results));

      postMessage({
        output: parser.results,
			});

    } catch (e) {
			console.log("DEBUG:workerParser:onmessage:catch");
			console.dir(e.message);
      postMessage(e.message); // This sends parse errors caught with exception to the client for visibility! Do not remove!
		}
	}
};