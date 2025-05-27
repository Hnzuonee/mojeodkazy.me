// netlify/functions/verify-captcha.js
const fetch = require('node-fetch'); // Ujistěte se, že máte node-fetch v package.json, pokud cílíte na starší Node.js

// DŮLEŽITÉ: Nastavte tyto proměnné v Netlify administraci (Site settings -> Build & deploy -> Environment)
const TURNSTILE_SECRET_KEY = process.env.YOUR_TURNSTILE_SECRET_KEY;
const FINAL_DESTINATION_URL = process.env.https://onlyfans.com/kristynka.cengerova; // Např. "https://www.mojeodkazy.me/finalni-obsah.html"

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    try {
        let token;
        // Netlify parsuje application/x-www-form-urlencoded tělo do stringu
        if (event.body && event.headers['content-type'] && event.headers['content-type'].includes('application/x-www-form-urlencoded')) {
            const params = new URLSearchParams(event.body);
            token = params.get('cf-turnstile-response');
        } else if (event.body && event.headers['content-type'] && event.headers['content-type'].includes('application/json')) {
            // Pro případ, že byste se rozhodli posílat JSON
            const bodyData = JSON.parse(event.body);
            token = bodyData['cf-turnstile-response'];
        }

        if (!token) {
            return { statusCode: 400, body: JSON.stringify({ error: "Chybí ověřovací token." }) };
        }
        if (!TURNSTILE_SECRET_KEY) {
            console.error("Chybí TURNSTILE_SECRET_KEY v environment proměnných!");
            return { statusCode: 500, body: JSON.stringify({ error: "Chyba serveru - konfigurace." }) };
        }
        if (!FINAL_DESTINATION_URL) {
            console.error("Chybí FINAL_DESTINATION_URL v environment proměnných!");
            return { statusCode: 500, body: JSON.stringify({ error: "Chyba serveru - konfigurace cíle." }) };
        }

        const verificationResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: TURNSTILE_SECRET_KEY,
                response: token,
                // remoteip: event.headers['x-nf-client-connection-ip'], // Volitelné
            }),
        });

        const verificationData = await verificationResponse.json();

        if (verificationData.success) {
            return {
                statusCode: 302,
                headers: { 'Location': FINAL_DESTINATION_URL },
                body: '',
            };
        } else {
            console.error("Ověření Turnstile selhalo:", verificationData['error-codes']);
            // Můžete přesměrovat na stránku s chybou nebo zobrazit chybovou zprávu
            // Pro jednoduchost zde vrátíme chybu.
            const errorPageHtml = `
                <!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Chyba Ověření</title>
                <style>body{font-family:sans-serif;text-align:center;padding:40px;background:#16161d;color:#f5f5f5;} h1{color:#be4dff;}</style></head>
                <body><h1>Ověření se nezdařilo</h1><p>Bohužel, nebylo možné ověřit, že nejste robot. Zkuste to prosím znovu.</p>
                <p><a href="https://www.mojeodkazy.me/verify.html" style="color:#be4dff;">Zpět na ověření</a></p>
                <p><small>Chybové kódy: ${verificationData['error-codes'] ? verificationData['error-codes'].join(', ') : 'žádné'}</small></p>
                </body></html>`;
            return {
                statusCode: 403,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
                body: errorPageHtml,
            };
        }
    } catch (error) {
        console.error("Chyba ve funkci verify-captcha:", error);
        const errorPageHtml = `
            <!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Chyba Serveru</title>
            <style>body{font-family:sans-serif;text-align:center;padding:40px;background:#16161d;color:#f5f5f5;} h1{color:#be4dff;}</style></head>
            <body><h1>Interní chyba serveru</h1><p>Omlouváme se, došlo k neočekávané chybě. Zkuste to prosím později.</p></body></html>`;
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
            body: errorPageHtml,
        };
    }
};
