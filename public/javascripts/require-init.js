requirejs.config({
    baseUrl: 'scripts',
    paths: {
        THREE: "lib/three.min",
        MersenneTwister: "lib/mersenne-twister",
        SocketIO: "../socket.io/socket.io"
    },
    shim: {
        THREE: {
            exports: "THREE"
        },
        MersenneTwister: {
            exports: "MersenneTwister"
        },
        SocketIO: {
            exports: "io"
        }
    }
});

requirejs(['main']);
