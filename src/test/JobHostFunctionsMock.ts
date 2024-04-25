
import NostrConnectorClient from "../runtime/PoolConnectorClient";
import MockFunctions from "./MockFunctions";
export default class JobHostFunctions extends MockFunctions {
    constructor(client: NostrConnectorClient) {
        super("Job");

        this.registerFunction("log", async (mng, pluginPath, pluginId, currentJob, cp, offs: bigint) => {
            const log = cp.read(offs).text();
            // console.log("log ", log);
            this.record("log", { log });
        });
        this.registerFunction("get", async (mng, pluginPath, pluginId, currentJob, cp, offs: bigint) => {
            const jobId = cp.read(offs).text() || currentJob.id;
            // console.info("get", jobId);
            this.record("get", { jobId });
            return cp.store("{}");
        });
        this.registerFunction("isDone", async (mng, pluginPath, pluginId, currentJob, cp, offs: bigint) => {
            const jobId = cp.read(offs).text();
            // console.info("isDone", jobId);
            this.record("isDone", { jobId });
            return cp.store("{}");
        });
        this.registerFunction(
            "newInputEventRef",
            async (
                mng,
                pluginPath,
                pluginId,
                currentJob,
                cp,
                eventIdOff: bigint,
                markerOff: bigint,
                sourceOff: bigint
            ) => {
                const ref = cp.read(eventIdOff).text();
                const marker = cp.read(markerOff).text();
                const source = cp.read(sourceOff).text();
                // console.info("newInputEventRef", ref, marker, source);
                this.record("newInputEventRef", { ref, marker, source });
                return cp.store("{}");
            }
        );
        this.registerFunction(
            "newInputJobRef",
            async (
                mng,
                pluginPath,
                pluginId,
                currentJob,
                cp,
                jobIdOff: bigint,
                markerOff: bigint,
                sourceOff: bigint
            ) => {
                const ref = cp.read(jobIdOff).text();
                const marker = cp.read(markerOff).text();
                const source = cp.read(sourceOff).text();
                // console.info("newInputJobRef", ref, marker, source);
                this.record("newInputJobRef", { ref, marker, source });
                return cp.store("{}");
            }
        );
        this.registerFunction(
            "newInputData",
            async (mng, pluginPath, pluginId, currentJob, cp, dataOff: bigint, markerOff: bigint) => {
                const data = cp.read(dataOff).text();
                const marker = cp.read(markerOff).text();
                // console.info("newInputData", data, marker);
                this.record("newInputData", { data, marker });
                return cp.store("{}");
            }
        );
        this.registerFunction(
            "newParam",
            async (mng, pluginPath, pluginId, currentJob, cp, keyOff: bigint, valuesJsonOffset: bigint) => {
                const key = cp.read(keyOff).text();
                const values = cp.read(valuesJsonOffset).text();
                // console.info("newParam", key, values);
                this.record("newParam", { key, values });
                return cp.store("{}");
            }
        );
        this.registerFunction(
            "request",
            async (mng, pluginPath, pluginId, currentJob, cp, reqOff: bigint) => {
                const req = cp.read(reqOff).json();
                this.record("request", req);
                return cp.store("{}");
            }
        );

        this.expected = {
            log: {
                log: "Hello from js 1",
            },
            get: {
                jobId: "jobID1234",
            },
            isDone: {
                jobId: "\u0000",
            },
            newInputEventRef: {
                ref: "event",
                marker: "maker",
                source: "relay",
            },
            newInputJobRef: {
                ref: "job",
                marker: "marker",
                source: "relay",
            },
            newInputData: {
                data: "data",
                marker: "marker",
            },
            newParam: {
                key: "key",
                values: '["value"]',
            },
            request: {
                runOn: "runOn",
                maxDuration: "0",
                description: "desc",
                inputs: '"input"',
                params: '"params"',
            },
        };
    }
}
