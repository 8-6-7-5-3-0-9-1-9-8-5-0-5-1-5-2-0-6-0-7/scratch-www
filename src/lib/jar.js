var cookie = require('cookie');
var xhr = require('xhr');
var pako = require('pako');

/**
 * Module that handles coookie interactions.
 *     (Cookies?!?! Jar?!?! Get it?!?! WE'RE AMAZING!!!!)
 *
 * get(name, callback) – can be sync or async, as callback is optional
 * set(name, value) – synchronously sets the cookie
 * use(name, uri, callback) – can by sync or async, gets cookie from the uri if not there.
 */
var Jar = {
    unsign: function (value, callback) {
        // Return the usable content portion of a signed, compressed cookie generated by
        // Django's signing module
        // https://github.com/django/django/blob/stable/1.8.x/django/core/signing.py
        if (!value) return callback('No value to unsign');
        try {
            var b64Data = value.split(':')[0];
            var decompress = false;
            if (b64Data[0] === '.') {
                decompress = true;
                b64Data = b64Data.substring(1);
            }

            // Django makes its base64 strings url safe by replacing + and / with - and _ respectively
            // using base64.urlsafe_b64encode
            // https://docs.python.org/2/library/base64.html#base64.b64encode
            b64Data = b64Data.replace(/[-_]/g, function (c) {return {'-':'+', '_':'/'}[c]; });
            var strData = atob(b64Data);

            if (decompress) {
                var charData = strData.split('').map(function (c) { return c.charCodeAt(0); });
                var binData = new Uint8Array(charData);
                var data = pako.inflate(binData);
                strData = String.fromCharCode.apply(null, new Uint16Array(data));
            }

            return callback(null, strData);
        } catch (e) {
            return callback(e);
        }
    },
    get: function (name, callback) {
        // Get cookie by name
        var obj = cookie.parse(document.cookie) || {};

        // Handle optional callback
        if (typeof callback === 'function') {
            if (typeof obj === 'undefined') return callback('Cookie not found.');
            return callback(null, obj[name]);
        }

        return obj[name];
    },
    use: function (name, uri, callback) {
        // Attempt to get cookie
        Jar.get(name, function (err, obj) {
            if (typeof obj !== 'undefined') return callback(null, obj);

            // Make XHR request to cookie setter uri
            xhr({
                uri: uri
            }, function (err) {
                if (err) return callback(err);
                Jar.get(name, callback);
            });
        });
    },
    set: function (name, value) {
        var obj = cookie.serialize(name, value);
        var expires = '; expires=' + new Date(new Date().setYear(new Date().getFullYear() + 1)).toUTCString();
        var path = '; path=/';
        document.cookie = obj + expires + path;
    },
    getSignedValue: function (cookieName, signedValue, callback) {
        // Get a value from a signed object
        Jar.get(cookieName, function (err, value) {
            if (err) return callback(err);
            Jar.unsign(value, function (err, contents) {
                if (err) return callback(err);
                try {
                    var data = JSON.parse(contents);
                } catch (err) {
                    return callback(err);
                }
                return callback(null, data[signedValue]);
            });
        });
    }
};

module.exports = Jar;
