import { HostFunctionsNamespace } from "../runtime/HostFunctionsNamespace";

export default class MockFunctions extends HostFunctionsNamespace {
    results={};
    expected={};
    constructor(name) {
        super(name);
        
    }

    record(call,result){
        this.results[call]=result;
    }

    check(){
        const serializer = (key, value) => (typeof value === "bigint" ? value.toString() : value); 
        const a = JSON.stringify(this.results, serializer).trim();
        const b = JSON.stringify(this.expected, serializer).trim();        
        if(a!=b){
          throw new Error(
              `Expected ${JSON.stringify(this.expected, serializer, 2)}\nbut got\n${JSON.stringify(
                  this.results,
                  serializer,
                  2
              )}`
          );
       }
       return true;
    }
}
