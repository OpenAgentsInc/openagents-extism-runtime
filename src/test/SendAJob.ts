import { generateSecretKey, getPublicKey, finalizeEvent, SimplePool } from "nostr-tools";
import ws from "ws";
import { useWebSocketImplementation } from "nostr-tools";
useWebSocketImplementation(ws);

async function sleep(ms){
    return new Promise((resolve) => setTimeout(resolve, ms));
}


async function main() {

    // Generate a new keypair for the user (should be pulled from the database or use external signing (eg. browser extension))
    const userPrivateKey=generateSecretKey();
    const userPublicKey=getPublicKey(userPrivateKey);
     

    // Prepare a entry event
    const event = finalizeEvent(
        {
            kind: 5003,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ["param","run-on","openagents/extism-runtime"],
                ["expiration",""+Math.floor((Date.now()+1000*60*2)/1000)],
                ["param","main","plugin.wasm"],
                ["param","dependencies","[]"],
                ["param","description","Run something"],
            ],
            content: "",
        },
        userPrivateKey
    );

    // The event.id is the unique identifier for the Job
    const jobId = event.id;

    // Send the event to the Nostr network    
    const pool = new SimplePool();
    let relays = ["wss://nostr.rblb.it:7777"];
    pool.publish(relays, event);
    

    // Wait for a kind 7000 event (job feedback) that signal success
    let jobComplete=null;
    while (true) {
        // Pull kind 7000 events associated with the jobId
        const resultEvents = await pool.querySync(relays, {
            kinds: [7000],
            "#e": [jobId],
        });

        // For each event, check if the status is success
        for (const event of resultEvents) {
            const tags = event.tags;
            for (const tag of tags) {
                if (tag[0] == "status"&&tag[1] == "success") jobComplete=event;         
                // TODO handle error (status "error")          
                if(jobComplete!=null) break;                
            }
            if (jobComplete != null) break;            
        }

        if (jobComplete != null) break;
        await sleep(100);
    }

    // The job is completed, now we can pull the result
    let jobResult=null;
    while(true){
        // Pull the last job response associated with the jobId
        const resultEvents = await pool.querySync(relays, {
            kinds: [5003],
            "#e": [jobId],
            limit: 1
        });

        if(resultEvents.length>0){
            jobResult=resultEvents[0];
            break;
        }
        await sleep(100);
    }


    console.log("Job complete: ", jobComplete);



}

main();
