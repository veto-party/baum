import { expectType } from "tsd";
import { MergeDeepForToDefinitionStructureWithTupleMerge } from "../MergeDeepForToDefinitionStructureWithTupleMerge.js";


type InA = [void, {
    properties: {
        hello: 'world'
    }
}];

type InB = [{
    properties: {
        test: '2'
    }
}, {
    properties: {
        test: '2'
    }
}];

type Result = MergeDeepForToDefinitionStructureWithTupleMerge<InA, InB>;

type Expected = [{
    properties: {
        test: '2'
    }
}, {
    properties: {
        hello: 'world',
        test: '2'
    }
}]

expectType<Expected>({} as unknown as Result)
