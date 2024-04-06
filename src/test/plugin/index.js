const Job=require("../../lib/Job.cjs");
const Nostr = require( "../../lib/Nostr.cjs");
async function run(){
    await  Job.log("Hello from js 1");
    await Job.get("jobID1234");
    await Job.isDone("jobID1234");
    await Job.newInputEventRef("event","maker","relay");
    await Job.newInputJobRef("job","marker","relay");
    await Job.newInputData("data","marker","relay");
    await Job.newParam("key","value");
    await Job.request("runOn",123,"desc","input","params");

    await Nostr.sendSignedEvent("event");
    await Nostr.subscribeToEvents("filters");
    await Nostr.unsubscribeFromEvents("subId");
    await Nostr.getEvents("subId",123);

    // Host.outputString(`Hello ${offset}`)
}

module.exports = {run };