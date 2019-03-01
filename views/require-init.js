requirejs.config({
    baseUrl: 'scripts',
    paths: {
        THREE: "../lib/three.min",
        MersenneTwister: "../lib/mersenne-twister",
        QRCode: "../lib/qrcode.min",
        SocketIO: "../socket.io/socket.io",
        jQuery: "../lib/jquery-2.1.4.min"
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
        },
        jQuery: {
            exports: "jQuery",
        }
    }
});

requirejs(['main']);