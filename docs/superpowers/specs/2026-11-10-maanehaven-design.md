# Månehaven: design

Dato: 2026-11-10. Design godkendt i chatten af Tom.

## Formål

Et roligt, originalt co-op-spil for 2–4 venner online i browseren, hver på sin pc. I passer en magisk have om natten og dyrker de blomster, månen ønsker sig. Haven vokser fra gang til gang, så man har lyst til at vende tilbage. Der er intet nederlag.

Succes betyder:
- En gruppe kan gå fra link til spil på under to minutter.
- En nat føles hyggelig og kræver, at man snakker sammen.
- Haven er der stadig, næste gang man spiller.

## Valg truffet med Tom

- Online på hver sin pc, ligesom Skillet Scrap og Stormvagt.
- 2D akvarel set oppefra.
- Én have, der vokser fra gang til gang.
- Månens ønsker er målet, og der er intet nederlag.
- Dansk tekst.

## Antagelser

- Tastatur i browseren, 2–4 spillere. Start kræver mindst 2.
- Spillerne bruger deres egen stemmechat.
- Haven gemmes i browseren hos alle, der var med i natten. Den, der opretter rummet, bruger sin egen have.

## Styring

| Tast | Handling |
|---|---|
| WASD eller piletasterne | Gå frit rundt |
| Mellemrum | Saml op, plant, høst, aflevér, eller læg fra dig. Hold nede for at vande, fylde kanden eller tænde en lygte. |

Man bærer én ting ad gangen: en frøpose (én blomstertype), vandkanden eller en plukket blomst.

## Verden

- Haven ses oppefra og tegnes i en verden på 960×540 enheder, skaleret til skærmen.
- **Bede:** 6 fra start i et fast mønster. Der er plads til 12, og de låses op i fast rækkefølge.
- **Brønden** fylder vandkanden.
- **Frøskuret** har én frøkasse pr. låst-op blomstertype.
- **Lygter:** 2 fra start på faste pladser og op til 4.
- **Månealteret** er der, hvor blomster afleveres. Månen bevæger sig over himlen og viser nattens fremgang.
- Spillerne går igennem hinanden. Haven har kanter, man ikke kan gå ud over.

## Blomster

| Blomst | Gro-tid (fugtig) | Støv-værdi | Fra start |
|---|---|---|---|
| Måneklokke (blå) | 40 s | 1 | ja |
| Natviol (lilla) | 50 s | 1 | ja |
| Sølvrose | 80 s | 2 | nej |
| Stjernetidsel | 100 s | 3 | nej |
| Tvillingelilje | 90 s | 4 | nej |

- **Plant:** stå ved et tomt bed med en frøpose, og tryk mellemrum. Posen bruges op.
- **Tvillingelilje:** to spillere med hver sin tvillingelilje-pose skal trykke mellemrum ved samme tomme bed inden for 1 sekund af hinanden. Ellers sker der ingenting, og poserne beholdes.
- **Fugtighed:** et bed har fugtighed fra 0 til 100.
  - At vande fylder det til 100 og kræver, at man holder mellemrum i 1 sekund med vand i kanden. Det bruger én vanding fra kanden.
  - Fugtigheden falder til 0 på 30 sekunder.
  - Planten gror kun, mens bedet er fugtigt.
- **Vækst:** planten går gennem stadierne frø, spire, knop og blomst. Når den er udvokset, er den i blomst.
- **Høst:** tryk mellemrum ved en blomst med tomme hænder. Man bærer nu blomsten, og bedet bliver tomt.
- **Vandkanden** rummer 3 vandinger, eller 6 med den store kande. Den fyldes ved brønden ved at holde mellemrum i 1 sekund. Der er én vandkande, og den ligger ved brønden fra start.

## Natsværmere og lygter

- Natsværmere kommer ind fra havens kant med jævne mellemrum: 1 pr. 30 sekunder ved 2 spillere.
- De flyver mod den nærmeste blomst i blomst, som ikke er i lyset fra en tændt lygte.
- Sidder en natsværmer 15 sekunder på en blomst, visner den. Bedet bliver tomt, og natsværmeren flyver væk.
- Går en spiller ind i en natsværmer, eller tændes en lygte, så natsværmeren er i lyset, flygter den ud af haven.
- En lygte tændes ved at holde mellemrum i 1 sekund. Den lyser i 60 sekunder med en radius på 140.

## Månens ønsker

- Månen viser 2 ønsker ad gangen ved 2 spillere og 3 ved 3–4 spillere.
- Et ønske er 2–4 blomster (3–5 ved 4 spillere) af de låste-op typer. Tvillingeliljen indgår først, når den er låst op.
- **Aflevering:** tryk mellemrum ved alteret, mens du bærer en blomst.
  - Blomsten tæller i det første ønske, der mangler den type.
  - Mangler intet ønske typen, bliver den en gave, der giver blomstens støv-værdi.
- **Opfyldt ønske:** giver summen af blomsternes støv-værdi plus 3 i bonus. Et nyt ønske kommer efter 5 sekunder.
- **Glemte ønsker:** et ønske, som ingen opfylder inden for 4 minutter, glemmer månen, og der kommer et nyt efter 5 sekunder. Det blev tilføjet efter simulering, så et ønske, holdet ikke kan opfylde (for eksempel tvillingeliljer), ikke blokerer resten af natten.

## Natten

- En nat varer 12 minutter. Ved daggry slutter natten, og ingen kan tabe.
- **Resultat:** opfyldte ønsker, afleverede blomster og støv fra natten.
- **Planter, der ikke er høstet,** gemmes med deres vækst. Fugtigheden starter på 0 næste nat.
- **Månefaser** skifter hver nat i rækkefølgen nymåne, tiltagende, fuldmåne, aftagende:
  - Nymåne: 50 % flere natsværmere.
  - Fuldmåne: planter gror 30 % hurtigere.
  - Aftagende: fugtigheden holder 50 % længere.
  - Tiltagende: ingen effekt.

## Haven mellem nætterne

- Haven gemmes som:
  `{ version: 1, nights, dust, beds, lanterns, bigCan, seeds: [typer], plants: [{ bed, type, growth }] }`
- **Butikken** findes i lobbyen. Kun opretteren kan købe, og alle ser haven og prisen.

| Køb | Pris |
|---|---|
| Nyt bed (7.–12.) | 12, 16, 20, 24, 28, 32 |
| Sølvrose-frø | 20 |
| Stjernetidsel-frø | 32 |
| Tvillingelilje-frø | 48 |
| Ekstra lygte (3. og 4.) | 24 hver |
| Stor vandkande | 30 |

Priserne blev fordoblet efter simulering (2026-11-10), fordi haven ellers var købt færdig på 2–3 nætter.

- **Når rummet oprettes,** sender opretterens browser sin have til serveren. Serveren kontrollerer og retter den, og ugyldige data giver en ny have. Rummet bruger den have.
- **Ved daggry** sender serveren den opdaterede have, og alle deltagere gemmer den i deres browser.
- **Opretter skifter:** rummet beholder sin have.

## Flere spillere

| Spillere | Ønsker ad gangen | Ønskestørrelse | Natsværmere |
|---|---|---|---|
| 2 | 2 | 2–4 | 1 pr. 30 s |
| 3 | 3 | 2–4 | 1 pr. 24 s |
| 4 | 3 | 3–5 | 1 pr. 20 s |

## Rum og forløb

Det fungerer som i Stormvagt:
1. **Forside:** navn, Opret rum, eller kode og Deltag.
2. **Lobby:** kode, spillere, haven med butik og "Sådan spiller I". Opretteren trykker Start.
3. Der tælles ned fra 3, og natten går i gang.
4. **Resultat:** Ny nat (opretteren) eller Tilbage til lobbyen.

Fejl og afbrydelser:
- Ukendt kode, fuldt rum og et rum midt i en nat giver hver sin danske besked.
- Hvis en spiller går midt i en nat, fortsætter natten. Det, spilleren bar, lægges hvor de stod, og de andre får besked i spillet.
- "Vækker serveren…" vises, mens en gratis server starter. Mistet forbindelse giver en knap tilbage til forsiden.

## Opbygning

- Samme opbygning som Stormvagt: Node.js med `ws` som eneste afhængighed, 30 opdateringer i sekundet på serveren med indhentning, så tiden holder på Windows, og cirka 20 tilstande i sekundet til browserne, som blander mellem dem.
- Reglerne er ren kode, så de kan testes direkte.
- Rum, server, forbindelse og tastatur tages fra Stormvagt og tilpasses.
- Grafik i akvarel og lyd laves i kode og er originale.

## Test

- **Automatiske test af reglerne:** plantning, tvillingeliljen, fugtighed og vækst, vanding og kanden, høst, natsværmere og lygter, ønsker og støv, månefaser, nattens slut og den gemte have. Kontrol af en have med ugyldige data.
- **Automatiske test af rum og server:** opret med have, butik (kun opretteren, pris, maksimum), start kræver 2, at en spiller forlader en nat, og ødelagte beskeder.
- **Gennemspilning:** nætter med scriptede spillere mod den rigtige server ved 2, 3 og 4 spillere, og flere nætter i træk med den gemte have. Mindst én nat ses i en rigtig browser.
- **Online:** testes, når spillet er lagt ud.

## Hosting

En ny gratis Render-tjeneste, `maanehaven`, med koden på GitHub. README på dansk og `start-spil.bat`, som i Stormvagt.

## Uden for denne version

Gamepad, at vende tilbage midt i en nat, konti, haven på tværs af pc'er, pynt og møbler, musik, flere end 5 blomstertyper.
