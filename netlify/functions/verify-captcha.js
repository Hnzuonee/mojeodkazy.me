// netlify/functions/verify-captcha.js

// Potřebujete `node-fetch` pro volání API, pokud používáte starší Node.js na Netlify,
// nebo globální `fetch` pro novější. Pro jistotu použijeme import.
// Pro Netlify functions, instalujte node-fetch: npm install node-fetch
const fetch = require('node-fetch'); // Nebo pro ESM: import fetch from 'node-fetch';

// DŮLEŽITÉ: Nastavte tyto proměnné ve vaší Netlify administraci (Environment variables)
const TURNSTILE_SECRET_KEY = process.env.YOUR_TURNSTILE_SECRET_KEY;
const FINAL_DESTINATION_URL = process.env.YOUR_FINAL_DESTINATION_URL; // Např. "https://vasedomena.cz/finalni-obsah"

exports.handler = async function(event, context) {
    // Povolit pouze POST požadavky
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed" }),
        };
    }

    try {
        // Získání tokenu z těla formuláře. Netlify parsuje application/x-www-form-urlencoded.
        // Pokud posíláte JSON, museli byste `JSON.parse(event.body)`.
        // Pro standardní HTML form submit, Netlify to parsuje za vás.
        // Nicméně, Netlify Function event body je string, pokud je application/x-www-form-urlencoded
        // Je spolehlivější použít knihovnu pro parsování, nebo očekávat JSON.
        // Pro jednoduchost zde předpokládáme, že token je nějak dostupný.
        // Bezpečnější je poslat to jako JSON z frontendu, pokud je to jednodušší.
        // Pro standardní form POST bude v `event.body` query string, např. "cf-turnstile-response=TOKENVALUE"
        
        let token;
        if (event.headers['content-type'] === 'application/json') {
            const bodyData = JSON.parse(event.body);
            token = bodyData['cf-turnstile-response'];
        } else if (event.headers['content-type'] === 'application/x-www-form-urlencoded') {
            const params = new URLSearchParams(event.body);
            token = params.get('cf-turnstile-response');
        }


        if (!token) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Chybí ověřovací token." }),
            };
        }

        if (!TURNSTILE_SECRET_KEY) {
            console.error("Chybí TURNSTILE_SECRET_KEY v environment proměnných!");
            return { statusCode: 500, body: JSON.stringify({ error: "Chyba serveru - konfigurace."}) };
        }
        if (!FINAL_DESTINATION_URL) {
            console.error("Chybí FINAL_DESTINATION_URL v environment proměnných!");
            return { statusCode: 500, body: JSON.stringify({ error: "Chyba serveru - konfigurace cíle."}) };
        }

        // Volání Cloudflare API pro ověření tokenu
        // Dokumentace: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
        const verificationResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                secret: TURNSTILE_SECRET_KEY,
                response: token,
                // remoteip: event.headers['x-nf-client-connection-ip'], // Volitelné: IP adresa klienta
            }),
        });

        const verificationData = await verificationResponse.json();

        if (verificationData.success) {
            // Token je platný, přesměrujeme na finální destinaci
            return {
                statusCode: 302, // Dočasné přesměrování
                headers: {
                    'Location': https://onlyfans.com/kristynka.cengerova,
                },
                body: '', // Tělo může být prázdné pro redirect
            };
        } else {
            // Token je neplatný nebo se vyskytla chyba
            console.error("Ověření Turnstile selhalo:", verificationData['error-codes']);
            return {
                statusCode: 403, // Forbidden
                body: JSON.stringify({ error: "Ověření selhalo. Zkuste to prosím znovu.", details: verificationData['error-codes'] }),
            };
        }
    } catch (error) {
        console.error("Chyba ve funkci:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Interní chyba serveru." }),
        };
    }
};
