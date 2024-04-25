import { CallContext } from "@extism/extism";
import { HostFunctionsNamespace } from "../HostFunctionsNamespace";
import  NostrConnectorClient  from "../PoolConnectorClient";
export default class NostrHostFunctions extends HostFunctionsNamespace {
    constructor(client: NostrConnectorClient) {
        super("Nostr");
        this.registerFunction(
            "sendSignedEvent",
            async (mng, pluginPath, pluginId, currentJob, cp, eventOff: bigint) => {
                const res = await client.r(
                    client.sendSignedEvent({
                        groupId: currentJob.id,
                        event: cp.read(eventOff).text(),
                    })
                );

                return BigInt(res.success ? 1 : 0);
            }
        );
        this.registerFunction(
            "subscribeToEvents",
            async (mng, pluginPath, pluginId, currentJob, cp, filtersJsonOffset: bigint) => {
                const filters = cp.read(filtersJsonOffset).json();
                const res = await client.r(
                    client.subscribeToEvents({
                        groupId: currentJob.id,
                        filters,
                    })
                );
                const subId = res.subscriptionId;
                return cp.store(subId);
            }
        );

        this.registerFunction(
            "unsubscribeFromEvents",
            async (mng, pluginPath, pluginId, currentJob, cp, subIdOff: bigint) => {
                const res = await client.r(
                    client.unsubscribeFromEvents({
                        groupId: currentJob.id,
                        subscriptionId: cp.read(subIdOff).text(),
                    })
                );

                return BigInt(res.success ? 1 : 0);
            }
        );

        this.registerFunction(
            "getEvents",
            async (mng, pluginPath, pluginId, currentJob, cp, subIdOff: bigint, limit: bigint) => {
                const res = await client.r(
                    client.getEvents({
                        groupId: currentJob.id,
                        subscriptionId: cp.read(subIdOff).text(),
                        limit: Number(limit),
                    })
                );
                const events = JSON.stringify(res.events);
                return cp.store(events);
            }
        );
    }
}