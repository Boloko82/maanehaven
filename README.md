# Månehaven

## Hvad er det?

Et roligt co-op-spil for 2 til 4 venner, hver i sin egen browser. I er små havenisser, der om natten dyrker de blomster, månen ønsker sig. Haven vokser fra gang til gang, og der er intet nederlag.

Spillet ligger i mappen **Månehaven** i din **Dokumenter\Jette\Projects**-mappe.

## Sådan spiller I

| Tast | Hvad den gør |
|---|---|
| WASD eller piletasterne | Gå |
| Mellemrum | Saml op, plant, høst, aflevér, eller læg fra dig |
| Hold mellemrum nede | Vand et bed, fyld vandkanden ved brønden, eller tænd en lygte |
| M | Lyd til eller fra |

1. Én skriver et navn og klikker **Opret rum**. Vedkommende får en kode på 4 bogstaver, og rummet bruger den have, der er gemt i vedkommendes browser.
2. De andre skriver deres navn og koden og klikker **Deltag**.
3. Den, der oprettede rummet, kan købe til haven i lobbyen og trykker så **Start**. I skal være mindst 2.

**Natten (12 minutter)**
- Øverst ser I månens ønsker, for eksempel "3 natviol og en måneklokke". Aflevér blomsterne ved alteret til højre. Et opfyldt ønske giver månestøv. Blomster, ingen ønsker sig, bliver en gave og giver lidt støv.
- Hent frø i skuret til venstre, og plant dem i et bed. Hold bedet fugtigt med vandkanden, for planter gror kun i fugtig jord. En dråbe over bedet betyder, at det er tørt.
- Fyld vandkanden ved brønden nederst til venstre.
- **Tvillingeliljer** skal plantes af to nisser i samme bed på samme tid.
- **Natsværmere** spiser blomster, der står i blomst. Gå ind i dem, eller tænd en lygte, så flyver de væk.
- Et ønske, som ingen opfylder, glemmer månen efter 4 minutter, og så kommer der et nyt.
- Ved daggry tæller I månestøv. Planter, der ikke er høstet, står der stadig næste nat.

**Månen** skifter fase hver nat: ved nymåne er der flere natsværmere, ved fuldmåne gror alt hurtigere, og når månen er aftagende, holder jorden sig fugtig længere.

**Haven gemmes i browseren** hos alle, der var med i natten. Den, der opretter rummet, bruger sin egen have. På en anden pc eller i et privat vindue starter man med en ny have.

## Start spillet på din pc

1. Installer **Node.js** én gang: gå til https://nodejs.org, hent **LTS**-versionen, og installer den med standardvalgene.
2. Åbn mappen **Månehaven**, og dobbeltklik på **start-spil.bat**.
   - Første gang henter den en lille tilføjelse, så den skal have internet.
   - Din browser åbner på http://localhost:3001. Hvis ikke, skriv adressen selv.
   - Lad det sorte vindue være åbent, mens I spiller. Lukker du det, stopper spillet.
3. Vil du prøve alene, så åbn http://localhost:3001 i en ekstra fane, og deltag i dit eget rum.

**Venner på samme wifi** kan deltage direkte hos dig. Det sorte vindue viser din pc's adresse, for eksempel `http://192.168.1.20:3001`, og den skriver de i deres browser. Første gang spørger Windows måske, om Node.js må bruge netværket. Sæt flueben ved **Private netværk**, og klik **Tillad**.

## Spil med venner online

Det foregår præcis som med Stormvagt, og du har allerede kontiene.

**A. Læg filerne på GitHub**

1. Gå til https://github.com, og log ind.
2. Klik på **+** øverst til højre og så **New repository**. Kald det `maanehaven`, lad det være **Public**, og klik **Create repository**.
3. Klik på linket **uploading an existing file**.
4. Marker alt i mappen Månehaven **undtagen mappen `node_modules`**, og træk det ind i browservinduet.
5. Klik **Commit changes**, når uploaden er færdig. Tjek, at `public`, `server`, `package.json` og `render.yaml` står på listen.

**B. Kør det på Render**

1. Gå til https://render.com, og log ind med **GitHub**.
2. Klik **New** og så **Blueprint**, og vælg `maanehaven`. Måske skal du først give Render adgang til det nye repository via **Configure GitHub**.
3. Klik **Apply** eller **Deploy Blueprint**.
   - Er der ingen Blueprint-mulighed, så brug **New** > **Web Service**, vælg repositoryet, og udfyld: Language **Node**, Build Command `npm install`, Start Command `npm start`, Instance Type **Free**.
4. Vent, til der står **Live**. Linket, der ender på **onrender.com**, er jeres have. Send det til dine venner.

Den gratis plan falder i søvn efter omkring 15 minutter uden spillere. Næste besøg tager omkring et minut, og siden indlæser måske bare langsomt, eller Render viser sin egen indlæsningsside først.

## Fejlfinding

- **Første besøg er langsomt** (eller Render viser sin egen side, eller "Vækker serveren…"): normalt på den gratis plan. Giv det et minut, og genindlæs siden.
- **"Forbindelsen til serveren blev afbrudt"**: gå tilbage til forsiden, og opret eller deltag i et rum igen. Haven er gemt fra sidste daggry.
- **"Der er intet rum med den kode"**: tjek de 4 bogstaver. Store og små bogstaver og mellemrum er ligegyldige. Et rum forsvinder, når alle har forladt det.
- **"Rummet er i gang med en nat"**: vent, til de er tilbage i lobbyen.
- **"Rummet er fuldt"**: et rum har plads til 4 havenisser.
- **Mellemrum gør ingenting ved et bed**: måske bærer du noget, der ikke kan bruges der. Gå et lille stykke væk, og tryk mellemrum for at lægge det fra dig.
- **Venner på jeres wifi kan ikke forbinde**: de skal bruge adressen fra det sorte vindue (ikke `localhost`), være på samme netværk, og Node.js skal have lov gennem firewallen. Startmenu > "Tillad en app gennem Windows Firewall" > find **Node.js**, og sæt flueben ved **Privat**.
- **start-spil.bat siger, at Node.js ikke er installeret**: installer Node.js LTS fra https://nodejs.org, genstart pc'en, og prøv igen.
- **"EADDRINUSE" i det sorte vindue**: spillet kører allerede i et andet vindue.
- **Ingen lyd**: klik én gang på siden, og tjek knappen **Lyd til**.
