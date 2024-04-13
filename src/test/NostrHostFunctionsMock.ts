import NostrConnectorClient from "../runtime/PoolConnectorClient";
import MockFunctions from "./MockFunctions";
export default class NostrHostFunctionsMock extends MockFunctions {
    constructor(client: NostrConnectorClient) {
        super("Nostr");
        this.registerFunction("sendSignedEvent", async (mng, jobId, cp, eventOff: bigint) => {
            const event = cp.read(eventOff).text();
            // console.info("sendSignedEvent", event);
            this.record("sendSignedEvent", { event });
            return cp.store("{}");
        });
        this.registerFunction("subscribeToEvents", async (mng, jobId, cp, filtersJsonOffset: bigint) => {
            const filters = cp.read(filtersJsonOffset).json();
            // console.info("subscribeToEvents", filters);
            this.record("subscribeToEvents", { filters });
            return cp.store("{}");
        });

        this.registerFunction("unsubscribeFromEvents", async (mng, jobId, cp, subIdOff: bigint) => {
            const subscriptionId = cp.read(subIdOff).text();
            // console.info("unsubscribeFromEvents", subscriptionId);
            this.record("unsubscribeFromEvents", { subscriptionId });
            return cp.store("{}");
        });

        this.registerFunction("getEvents", async (mng, jobId, cp, subIdOff: bigint, limit: bigint) => {
            const subscriptionId = cp.read(subIdOff).text();
            // console.info("getEvents", subscriptionId, limit);
            this.record("getEvents", { subscriptionId, limit });
            return cp.store("[]");
        });

        this.expected = {
            sendSignedEvent: {
                event: '"event"',
            },
            subscribeToEvents: {
                filters: "filters",
            },
            unsubscribeFromEvents: {
                subscriptionId: "subId",
            },
            getEvents: {
                subscriptionId: "subId",
                limit: "0",
            },
        };
    }
}
