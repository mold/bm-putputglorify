define(["MersenneTwister"], function (MersenneTwister) {
    // Makes sure we have same 'random' every time
    return new MersenneTwister(42);
});
