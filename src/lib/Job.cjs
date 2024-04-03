const {
    Job_log,
    Job_get,
    Job_isDone,
    Job_newInputEventRef,
    Job_newInputJobRef,
    Job_newInputData,
    Job_newParam,
    Job_request
} = Host.getFunctions()


class Job {
    /**
     * Log a message for the current job
     * @param {string} message 
     */
    static log(message) {
        const mem=Memory.fromString(message);
        Job_log(mem.offset);
    }


    /**
     * Get a job by its id
     * @param {string} jobId the job id, if not provided, returns the current job
     * @returns {object}
     */
    static get(jobId){
        const mem = Memory.fromString(jobId||"");
        const respOffset=Job_get(mem.offset);
        return Memory.find(respOffset).readJsonObject();
    }

    /**
     * Check if a job is done
     * @param {string} jobId 
     * @returns {boolean}
     */
    static isDone(jobId){
        const resp=Job_isDone(jobId);
        return resp==1;     
    }


    /**
     * Create a new input that references to an event
     * @param {string} eventId  The event id
     * @param {string} marker  Optional marker for the input
     * @param {string} sourceRelay  Optional relay where the event is found
     * @returns {object} The input
     */
    static newInputEventRef(eventId, marker, sourceRelay){
        if (!sourceRelay) sourceRelay="";
        if(!marker) marker="";
        const memEventId=Memory.fromString(eventId);
        const memMarker=Memory.fromString(marker);
        const memSourceRelay=Memory.fromString(sourceRelay);
        const respOffset=Job_newInputEventRef(memEventId.offset, memMarker.offset, memSourceRelay.offset);
        return Memory.find(respOffset).readJsonObject();
    }
    
    /**
     * Create a new input that references to a job
     * @param {string} jobId  The job id
     * @param {string} marker Optional marker for the input
     * @param {string} sourceRelay Optional relay where the job is found
     * @returns {object} The input
     */
    static newInputJobRef(jobId, marker, sourceRelay){
        if (!sourceRelay) sourceRelay="";
        if(!marker) marker="";
        const memJobId=Memory.fromString(jobId);
        const memMarker=Memory.fromString(marker);
        const memSourceRelay=Memory.fromString(sourceRelay);
        const respOffset=Job_newInputJobRef(memJobId.offset, memMarker.offset, memSourceRelay.offset);
        return Memory.find(respOffset).readJsonObject();
    }


    /**
     * Create a new input that contains data
     * @param {string} data  The data
     * @param {string} marker Optional marker for the input
     * @returns {object} The input
     */
    static newInputData(data, marker){
        if(!marker) marker="";
        const memData=Memory.fromString(data);
        const memMarker=Memory.fromString(marker);
        const respOffset=Job_newInputData(memData.offset, memMarker.offset);
        return Memory.find(respOffset).readJsonObject();
    }


    /**
     * Create a new param
     * @param {string} name  The name of the param
     * @param  {...any} values  The values of the param
     * @returns {object} The param
     */
    static newParam(name, ...values){
        const valuesJson=JSON.stringify(values);
        const memName=Memory.fromString(name);
        const memValues=Memory.fromString(valuesJson)
        const respOffset=Job_newParam(memName.offset, memValues.offset);
        return Memory.find(respOffset).readJsonObject();
    }


    /**
     * Request a new job
     * @param {string} runOn  The image to run the job on
     * @param {number} expireAfter The time in seconds after which the job expires
     * @param {object} inputs The inputs of the job
     * @param {object} params The params of the job
     * @returns {object} The job
     */
    static request(runOn, expireAfter, inputs, params){
        const inputsJson=JSON.stringify(inputs);
        const paramsJson=JSON.stringify(params);
        const memRunOn=Memory.fromString(runOn);
        const memInputs=Memory.fromString(inputsJson);
        const memParams=Memory.fromString(paramsJson);
        const respOffset = Job_request(memRunOn.offset, expireAfter.offset, memInputs.offset, memParams.offset);
        return Memory.find(respOffset).readJsonObject();
    }


}

if(typeof module!=='undefined') module.exports=Job;