import { HostFunctionsNamespace } from "../HostFunctionsNamespace";

export default class TestHostFunctions extends HostFunctionsNamespace {
    failCallback: any;
    successCallback: any;

    constructor() {
        super("Test");
        this.registerFunction("fail", async (mng, jobId, cp, msgOffset: bigint) => {
            const msg=cp.read(msgOffset).text();
            console.error(msg);
            this.failCallback(msg);
        });
        this.registerFunction("success", async (mng, jobId, cp, msgOffset: bigint) => {
            const msg=cp.read(msgOffset).text();
            console.log(msg);
            this.successCallback(msg);
        });
    }

    async wait():Promise<string>{
        return new Promise((resolve, reject)=>{
            this.failCallback = reject;
            this.successCallback = resolve;
        });
    }

}
