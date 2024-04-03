const {
    Test_fail,
    Test_success
} = Host.getFunctions()


class Test {
    static fail(msg){
        const mem=Memory.fromString(msg);
        Test_fail(mem.offset);    
    }

    static success(msg){
        const mem=Memory.fromString(msg);
        Test_success(mem.offset);
    }



}

if (typeof module !== 'undefined') module.exports = Test