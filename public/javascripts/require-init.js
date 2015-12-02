requirejs.config({
    baseUrl: 'scripts',
    paths: {
        THREE: "lib/three.min",
        MersenneTwister: "lib/mersenne-twister",
        QRCode: "lib/qrcode.min",
        SocketIO: "../socket.io/socket.io"
    },
    shim: {
        THREE: {
            exports: "THREE"
        },
        MersenneTwister: {
            exports: "MersenneTwister"
        },
        QRCode: {
            exports: "QRCode"
        },
        SocketIO: {
            exports: "io"
        }
    }
});

requirejs(['main']);