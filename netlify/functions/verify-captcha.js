// netlify/functions/verify-captcha.js

// Předpokládáme, že 'node-fetch' je potřeba pro starší Node.js verze na Netlify.
// Pro Node.js 18+ na Netlify by měl být 'fetch' dostupný globálně.
// Pokud používáte globální fetch, tento řádek a závislost v package.json nejsou nutné.
const fetch = require('node-fetch'); 

// DŮLEŽITÉ: Nastavte tyto proměnné v Netlify administraci 
// (Site settings -> Build & deploy -> Environment variables)
const TURNSTILE_SECRET_KEY = process.env.YOUR_TURNSTILE_SECRET_KEY;
// OPRAVENÝ ŘÁDEK: Načítání z environmentální proměnné
const FINAL_DESTINATION_URL = process.env.YOUR_FINAL_DESTINATION_URL; 

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
        // Kontrola, zda byla FINAL_DESTINATION_URL úspěšně načtena z env proměnných
        if (!FINAL_DESTINATION_URL) {
            console.error("Chybí FINAL_DESTINATION_URL v environment proměnných nebo je prázdná!");
            return { statusCode: 500, body: JSON.stringify({ error: "Chyba serveru - konfigurace cíle." }) };
        }

        const verificationResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: TURNSTILE_SECRET_KEY,
                response: token,
                // remoteip: event.headers['x-nf-client-connection-ip'], // Volitelné pro předání IP klienta
            }),
        });

        const verificationData = await verificationResponse.json();

        if (verificationData.success) {
            // Token je platný, přesměrujeme na finální destinaci
            return {
                statusCode: 302, // Dočasné přesměrování
                headers: { 
                    'Location': FINAL_DESTINATION_URL // Zde se použije URL z env proměnné
                },
                body: '', // Tělo může být prázdné pro redirect
            };
        } else {
            console.error("Ověření Turnstile selhalo:", verificationData['error-codes']);
            const errorCodes = verificationData['error-codes'] ? verificationData['error-codes'].join(', ') : 'neznámá chyba';
            // Vracíme HTML stránku s chybou
            const errorPageHtml = `
                <!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"><title>Chyba Ověření</title>
                <style>body{font-family:sans-serif;text-align:center;padding:40px;background:#16161d;color:#f5f5f5;} h1{color:#be4dff;} a{color:#be4dff;}</style></head>
                <body><h1>Ověření se nezdařilo</h1><p>Bohužel, nebylo možné ověřit, že nejste robot. Zkuste to prosím znovu.</p>
                <p><a href="/verify.html">Zpět na ověření</a></p> <p><small>Detail chyby: ${errorCodes}</small></p>
                </body></html>`;
            return {
                statusCode: 403, // Forbidden
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
                body: errorPageHtml,
            };
        }
    } catch (error) {
        console.error("Chyba ve funkci verify-captcha:", error.toString());
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
