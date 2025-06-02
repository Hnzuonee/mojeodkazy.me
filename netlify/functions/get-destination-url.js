exports.handler = async function(event, context) {
    // Zde je vaše cílová URL, kterou chcete "skrýt" z klientského kódu
    const targetUrl = "https://onlyfans.com/jentvojekiks";

    // CORS hlavičky pro případné testování z různých prostředí
    // V produkci můžete 'Access-Control-Allow-Origin' omezit na vaši doménu
    const headers = {
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS' // Povolujeme GET pro tento endpoint
    };

    // Netlify automaticky zpracuje OPTIONS požadavky pro CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204, // No Content
            headers: headers,
            body: ''
        };
    }

    // Očekáváme GET požadavek na tuto funkci
    if (event.httpMethod === "GET") {
        return {
            statusCode: 200,
            headers: {
                ...headers, // Přidáme CORS hlavičky
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ targetUrl: targetUrl }),
        };
    } else {
        return {
            statusCode: 405, // Method Not Allowed
            headers: headers,
            body: JSON.stringify({ message: "Povolená je pouze metoda GET" }),
        };
    }
};
