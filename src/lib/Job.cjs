const {
    Job_log,
    Job_get,
    Job_isDone,
    Job_newInputEventRef,
    Job_newInputJobRef,
    Job_newInputData,
    Job_newParam,
    Job_request,
    Job_subrequest,
    Job_waitFor
} = Host.getFunctions()


class Job {
    /**
     * Log a message for the current job
     * @param {string} message 
     */
    static async log(tx) {
        const mem = Memory.fromString(tx);
        await Job_log(mem.offset);
    }


    /**
     * Get a job by its id
     * @param {string} jobId the job id, if not provided, returns the current job
     * @returns {object}
     */
    static async get(jobId) {
        const mem = Memory.fromString(jobId || "");
        const respOffset = await Job_get(mem.offset);
        return Memory.find(respOffset).readJsonObject();
    }

    /**
     * Check if a job is done
     * @param {string} jobId 
     * @returns {boolean}
     */
    static async isDone(jobId) {
        const mem = Memory.fromString(jobId);
        const resp = await Job_isDone(mem.offset);
        return resp == 1;
    }


    /**
     * Create a new input that references to an event
     * @param {string} eventId  The event id
     * @param {string} marker  Optional marker for the input
     * @param {string} sourceRelay  Optional relay where the event is found
     * @returns {object} The input
     */
    static async newInputEventRef(eventId, marker, sourceRelay) {
        if (!sourceRelay) sourceRelay = "";
        if (!marker) marker = "";
        const memEventId = Memory.fromString(eventId);
        const memMarker = Memory.fromString(marker);
        const memSourceRelay = Memory.fromString(sourceRelay);
        const respOffset = await Job_newInputEventRef(memEventId.offset, memMarker.offset, memSourceRelay.offset);
        return Memory.find(respOffset).readJsonObject();
    }

    /**
     * Create a new input that references to a job
     * @param {string} jobId  The job id
     * @param {string} marker Optional marker for the input
     * @param {string} sourceRelay Optional relay where the job is found
     * @returns {object} The input
     */
    static async newInputJobRef(jobId, marker, sourceRelay) {
        if (!sourceRelay) sourceRelay = "";
        if (!marker) marker = "";
        const memJobId = Memory.fromString(jobId);
        const memMarker = Memory.fromString(marker);
        const memSourceRelay = Memory.fromString(sourceRelay);
        const respOffset = await Job_newInputJobRef(memJobId.offset, memMarker.offset, memSourceRelay.offset);
        return Memory.find(respOffset).readJsonObject();
    }


    /**
     * Create a new input that contains data
     * @param {string} data  The data
     * @param {string} marker Optional marker for the input
     * @returns {object} The input
     */
    static async newInputData(data, type = "text", marker = "", source = "") {
        if (!marker) marker = "";
        if (typeof data !== "string") data = data.toString();
        const memData = Memory.fromString(data);
        const memMarker = Memory.fromString(marker);
        const memType = Memory.fromString(type);
        const memSource = Memory.fromString(source);
        const respOffset = await Job_newInputData(memData.offset, memType.offset, memMarker.offset, memSource.offset);
        return Memory.find(respOffset).readJsonObject();
    }


    /**
     * Create a new param
     * @param {string} name  The name of the param
     * @param  {...any} values  The values of the param
     * @returns {object} The param
     */
    static async newParam(name, values) {
        if (!Array.isArray(values)) values = [values];
        const valuesJson = JSON.stringify(values);
        const memName = Memory.fromString(name);
        const memValues = Memory.fromString(valuesJson)
        const respOffset = await Job_newParam(memName.offset, memValues.offset);
        return Memory.find(respOffset).readJsonObject();
    }


    /**
     * Request a new job
    {
            runOn:"openagents/extism-runtime",
            expireAfter:  Date.now()+1000*60*60,
            description: "Get zip code info",
            inputs: [
                Job.newInputData(JSON.stringify(subReqInputData))
            ],
            params: [
                Job.newParam("main","https://github.com/OpenAgentsInc/plugin-world-zipcode-finder/raw/main/plugin.wasm")
            ],
            kind: undefined,
            outputFormat: undefined
        }
     * @returns {object} The job
     */
    static async request(req) {
        const memReq = Memory.fromString(JSON.stringify(req));
        const respOffset = await Job_request(memReq.offset);
        const data = Memory.find(respOffset).readJsonObject();
        return data.id;
    }

    static async subrequest(req) {
        const memReq = Memory.fromString(JSON.stringify(req));
        const respOffset = await Job_subrequest(memReq.offset);
        const data = Memory.find(respOffset).readJsonObject();
        return data.id;
    }


    static async waitForContents(jobId, nExpectedResults = 1, maxWaitTime = 1000 * 60 * 2){
        const job = await Job.waitFor(jobId, nExpectedResults, maxWaitTime);
        const choices=[];
        if (job){
            for (const state of job.results) {
                if (state.status == 3) {
                    choices.push(state);
                }
            }
        }
        // deduplicate ?
        return choices;
    }

    static async waitForContent(jobId, nExpectedResults = 1, maxWaitTime = 1000 * 60 * 2) {
        const job = await Job.waitFor(jobId, nExpectedResults, maxWaitTime);
        if (job){
            for(const state of job.results){
                if (state.status == 3){
                    return state.result.content;
                }
            }
        }
        throw new Error("No content found");
    }

    static async waitFor(jobId, nExpectedResults = 1, maxWaitTime = 1000 *60*2){
        jobId = await jobId;
        const jobIdOff = Memory.fromString(jobId);
        const res = await Job_waitFor(jobIdOff.offset, nExpectedResults, maxWaitTime);
        if(res == 0){
            throw new Error("Job "+jobId+" failed");
        }
        return Job.get(jobId);
    }


    static async pluginRequest(plugin, inputData, description, expireAfter) {
        const req = {
            runOn: "openagents/extism-runtime",
            expireAfter: expireAfter || 1000 * 60 * 60,
            description: description || "",
            inputs: [
                await Job.newInputData(JSON.stringify(inputData))
            ],
            params: [
                await Job.newParam("main", plugin)
            ],
            kind: undefined,
            outputFormat: undefined
        };
        const subReqId = (await Job.request(req)).id;
        return subReqId;
    }
}

if (typeof module !== 'undefined') module.exports = Job;