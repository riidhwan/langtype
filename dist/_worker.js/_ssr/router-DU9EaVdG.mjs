import { D as notFound } from "../_chunks/_libs/@tanstack/router-core.mjs";
import { c as createRouter, a as createRootRoute, b as createFileRoute, l as lazyRouteComponent, H as HeadContent, S as Scripts } from "../_chunks/_libs/@tanstack/react-router.mjs";
import { j as jsxRuntimeExports } from "../_chunks/_libs/react.mjs";
import "../_libs/cookie-es.mjs";
import "../_chunks/_libs/@tanstack/history.mjs";
import "../_libs/tiny-invariant.mjs";
import "../_libs/seroval.mjs";
import "../_libs/unenv.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "../_libs/tiny-warning.mjs";
import "../_libs/react-dom.mjs";
import "../_libs/isbot.mjs";
import "node:process";
const appCss = "/assets/globals-DAQPS3sT.css";
const Route$2 = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8"
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      },
      {
        title: "LangType"
      }
    ],
    links: [
      { rel: "stylesheet", href: appCss }
    ]
  }),
  shellComponent: RootDocument
});
function RootDocument({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("html", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("head", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsxRuntimeExports.jsx(Scripts, {})
    ] })
  ] });
}
const indexData = [
  {
    id: "basics",
    title: "German Basics",
    description: "Simple sentences to get you started."
  },
  {
    id: "casual_german_a2",
    title: "Everyday German Conversations",
    description: "100 practical A2-level sentences for daily interactions, hobbies, and social life."
  },
  {
    id: "tech",
    title: "Tech Talk",
    description: "Common programming phrases."
  }
];
const id$2 = "basics";
const title$2 = "German Basics";
const description$2 = "Simple sentences to get you started.";
const challenges$2 = [{ "id": "1", "original": "The quick brown fox jumps over the lazy dog.", "translation": "Der schnelle braune Fuchs springt über den faulen Hund." }];
const basicsData = {
  id: id$2,
  title: title$2,
  description: description$2,
  challenges: challenges$2
};
const id$1 = "casual_german_a2";
const title$1 = "Everyday German Conversations";
const description$1 = "100 practical A2-level sentences for daily interactions, hobbies, and social life";
const challenges$1 = [{ "id": "1", "original": "How was your weekend?", "translation": "Wie war dein Wochenende?" }, { "id": "2", "original": "I slept in late today", "translation": "Ich habe heute lange geschlafen" }, { "id": "3", "original": "Do you feel like having a coffee?", "translation": "Hast du Lust auf einen Kaffee?" }, { "id": "4", "original": "What are you doing tonight?", "translation": "Was machst du heute Abend?" }, { "id": "5", "original": "I still have to go shopping today", "translation": "Ich muss heute noch einkaufen gehen" }, { "id": "6", "original": "The weather is really nice today", "translation": "Das Wetter ist heute wirklich schön" }, { "id": "7", "original": "Are you coming to the cinema with us?", "translation": "Kommst du mit ins Kino?" }, { "id": "8", "original": "I am a bit tired", "translation": "Ich bin ein bisschen müde" }, { "id": "9", "original": "Where did you spend your vacation?", "translation": "Wo hast du deinen Urlaub verbracht?" }, { "id": "10", "original": "That was fun!", "translation": "Das hat Spaß gemacht!" }, { "id": "11", "original": "Can you please help me?", "translation": "Kannst du mir bitte helfen?" }, { "id": "12", "original": "Unfortunately, I don't understand that", "translation": "Ich verstehe das leider nicht" }, { "id": "13", "original": "What is your favorite food?", "translation": "Was ist dein Lieblingsessen?" }, { "id": "14", "original": "I like cooking for my friends", "translation": "Ich koche gerne für meine Freunde" }, { "id": "15", "original": "What time is it now?", "translation": "Wie spät ist es jetzt?" }, { "id": "16", "original": "I'll be there in ten minutes", "translation": "Ich komme in zehn Minuten" }, { "id": "17", "original": "Where exactly do you live?", "translation": "Wo wohnst du genau?" }, { "id": "18", "original": "My apartment is not far from here", "translation": "Meine Wohnung ist nicht weit von hier" }, { "id": "19", "original": "Do you have siblings?", "translation": "Hast du Geschwister?" }, { "id": "20", "original": "I work as a teacher in a school", "translation": "Ich arbeite als Lehrer in einer Schule" }, { "id": "21", "original": "What did you do yesterday?", "translation": "Was hast du gestern gemacht?" }, { "id": "22", "original": "I watched a movie yesterday", "translation": "Ich habe gestern einen Film gesehen" }, { "id": "23", "original": "Can we meet tomorrow?", "translation": "Können wir uns morgen treffen?" }, { "id": "24", "original": "Unfortunately, I have no time", "translation": "Ich habe leider keine Zeit" }, { "id": "25", "original": "That's a good idea", "translation": "Das ist eine gute Idee" }, { "id": "26", "original": "I'm looking forward to the party", "translation": "Ich freue mich auf die Party" }, { "id": "27", "original": "How is your family?", "translation": "Wie geht es deiner Familie?" }, { "id": "28", "original": "I am doing very well today", "translation": "Es geht mir heute sehr gut" }, { "id": "29", "original": "What do you like to drink most?", "translation": "Was trinkst du am liebsten?" }, { "id": "30", "original": "I'll take a glass of water", "translation": "Ich nehme ein Glas Wasser" }, { "id": "31", "original": "The bill, please", "translation": "Die Rechnung, bitte" }, { "id": "32", "original": "Can we pay separately?", "translation": "Können wir getrennt bezahlen?" }, { "id": "33", "original": "I forgot my key", "translation": "Ich habe meinen Schlüssel vergessen" }, { "id": "34", "original": "Where is the nearest bus stop?", "translation": "Wo ist die nächste Bushaltestelle?" }, { "id": "35", "original": "The bus is coming in five minutes", "translation": "Der Bus kommt in fünf Minuten" }, { "id": "36", "original": "I prefer riding my bike", "translation": "Ich fahre lieber mit dem Fahrrad" }, { "id": "37", "original": "How do you like this shirt?", "translation": "Wie findest du dieses Hemd?" }, { "id": "38", "original": "It suits you very well", "translation": "Es steht dir sehr gut" }, { "id": "39", "original": "Where did you buy that?", "translation": "Wo hast du das gekauft?" }, { "id": "40", "original": "That was a bargain", "translation": "Das war ein Schnäppchen" }, { "id": "41", "original": "I am busy right now", "translation": "Ich bin gerade beschäftigt" }, { "id": "42", "original": "Can we talk on the phone later?", "translation": "Können wir später telefonieren?" }, { "id": "43", "original": "I'll write you a message", "translation": "Ich schreibe dir eine Nachricht" }, { "id": "44", "original": "What is your phone number?", "translation": "Was ist deine Telefonnummer?" }, { "id": "45", "original": "I am new in town", "translation": "Ich bin neu in der Stadt" }, { "id": "46", "original": "How long have you been learning German?", "translation": "Seit wann lernst du Deutsch?" }, { "id": "47", "original": "I've been learning German for six months", "translation": "Ich lerne seit sechs Monaten Deutsch" }, { "id": "48", "original": "German is difficult but interesting", "translation": "Deutsch ist schwierig, aber interessant" }, { "id": "49", "original": "Can you please repeat that?", "translation": "Kannst du das bitte wiederholen?" }, { "id": "50", "original": "Please speak a bit slower", "translation": "Bitte sprich ein bisschen langsamer" }, { "id": "51", "original": "I am hungry", "translation": "Ich habe Hunger" }, { "id": "52", "original": "Shall we order pizza?", "translation": "Wollen wir Pizza bestellen?" }, { "id": "53", "original": "I don't eat meat", "translation": "Ich esse kein Fleisch" }, { "id": "54", "original": "Enjoy your meal!", "translation": "Guten Appetit!" }, { "id": "55", "original": "The food tastes delicious", "translation": "Das Essen schmeckt lecker" }, { "id": "56", "original": "I am full", "translation": "Ich bin satt" }, { "id": "57", "original": "Would you like some dessert?", "translation": "Möchtest du noch etwas Nachtisch?" }, { "id": "58", "original": "Where is the bathroom?", "translation": "Wo ist die Toilette?" }, { "id": "59", "original": "I am looking for the train station", "translation": "Ich suche den Bahnhof" }, { "id": "60", "original": "Go straight ahead", "translation": "Gehen Sie immer geradeaus" }, { "id": "61", "original": "Turn left", "translation": "Biegen Sie links ab" }, { "id": "62", "original": "It is on the right side", "translation": "Es ist auf der rechten Seite" }, { "id": "63", "original": "How far is it to the center?", "translation": "Wie weit ist es bis zum Zentrum?" }, { "id": "64", "original": "It takes about ten minutes", "translation": "Es dauert etwa zehn Minuten" }, { "id": "65", "original": "I have a headache", "translation": "Ich habe Kopfschmerzen" }, { "id": "66", "original": "I have to go to the doctor", "translation": "Ich muss zum Arzt gehen" }, { "id": "67", "original": "Get well soon!", "translation": "Gute Besserung!" }, { "id": "68", "original": "I don't feel well today", "translation": "Ich fühle mich heute nicht gut" }, { "id": "69", "original": "What do you do in your free time?", "translation": "Was machst du in deiner Freizeit?" }, { "id": "70", "original": "I like listening to music", "translation": "Ich höre gerne Musik" }, { "id": "71", "original": "I play soccer on the weekend", "translation": "Ich spiele am Wochenende Fußball" }, { "id": "72", "original": "Do you like reading books?", "translation": "Liest du gerne Bücher?" }, { "id": "73", "original": "I often go for a walk in the park", "translation": "Ich gehe oft im Park spazieren" }, { "id": "74", "original": "Do you have pets?", "translation": "Hast du Haustiere?" }, { "id": "75", "original": "I have a dog and a cat", "translation": "Ich habe einen Hund und eine Katze" }, { "id": "76", "original": "It is very cold outside today", "translation": "Es ist heute sehr kalt draußen" }, { "id": "77", "original": "Don't forget your umbrella", "translation": "Vergiss deinen Regenschirm nicht" }, { "id": "78", "original": "It's supposed to rain tomorrow", "translation": "Morgen soll es regnen" }, { "id": "79", "original": "I like summer the best", "translation": "Ich mag den Sommer am liebsten" }, { "id": "80", "original": "The sun is shining", "translation": "Die Sonne scheint" }, { "id": "81", "original": "Happy Birthday!", "translation": "Herzlichen Glückwunsch zum Geburtstag!" }, { "id": "82", "original": "Good luck with the exam!", "translation": "Viel Glück bei der Prüfung!" }, { "id": "83", "original": "Merry Christmas!", "translation": "Frohe Weihnachten!" }, { "id": "84", "original": "Happy New Year!", "translation": "Ein frohes neues Jahr!" }, { "id": "85", "original": "I thank you for the gift", "translation": "Ich danke dir für das Geschenk" }, { "id": "86", "original": "You're welcome", "translation": "Gern geschehen" }, { "id": "87", "original": "No problem", "translation": "Kein Problem" }, { "id": "88", "original": "Sorry for the delay", "translation": "Entschuldigung für die Verspätung" }, { "id": "89", "original": "It doesn't matter / Never mind", "translation": "Macht nichts" }, { "id": "90", "original": "Can we open the window?", "translation": "Können wir das Fenster aufmachen?" }, { "id": "91", "original": "I am warm", "translation": "Mir ist warm" }, { "id": "92", "original": "May I sit here?", "translation": "Darf ich mich hier hinsetzen?" }, { "id": "93", "original": "Is this seat still free?", "translation": "Ist dieser Platz noch frei?" }, { "id": "94", "original": "Unfortunately, I have to go now", "translation": "Ich muss jetzt leider gehen" }, { "id": "95", "original": "It was nice to see you", "translation": "Es war schön, dich zu sehen" }, { "id": "96", "original": "See you soon!", "translation": "Bis bald!" }, { "id": "97", "original": "Have a nice weekend!", "translation": "Schönes Wochenende!" }, { "id": "98", "original": "Get home safely", "translation": "Komm gut nach Hause" }, { "id": "99", "original": "Talk to you soon!", "translation": "Wir hören uns!" }, { "id": "100", "original": "Sleep well!", "translation": "Schlaf gut!" }];
const casualGermanA2Data = {
  id: id$1,
  title: title$1,
  description: description$1,
  challenges: challenges$1
};
const id = "tech";
const title = "Tech Talk";
const description = "Common programming phrases.";
const challenges = [{ "id": "2", "original": "I like to code in TypeScript.", "translation": "Ich programmiere gerne in TypeScript." }, { "id": "3", "original": "Next.js is a great framework.", "translation": "Next.js ist ein tolles Framework." }];
const techData = {
  id,
  title,
  description,
  challenges
};
const collectionsMap = {
  basics: basicsData,
  casual_german_a2: casualGermanA2Data,
  tech: techData
};
async function getCollections() {
  return indexData;
}
async function getCollection(id2) {
  return collectionsMap[id2];
}
const $$splitComponentImporter$1 = () => import("./index-qlYEZ2kb.mjs");
const Route$1 = createFileRoute("/")({
  component: lazyRouteComponent($$splitComponentImporter$1, "component"),
  loader: async () => {
    return await getCollections();
  }
});
const $$splitComponentImporter = () => import("./collections._id-CjSVnOjG.mjs");
const Route = createFileRoute("/collections/$id")({
  component: lazyRouteComponent($$splitComponentImporter, "component"),
  loader: async ({
    params
  }) => {
    const collection = await getCollection(params.id);
    if (!collection) {
      throw notFound();
    }
    return collection;
  }
});
const IndexRoute = Route$1.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$2
});
const CollectionsIdRoute = Route.update({
  id: "/collections/$id",
  path: "/collections/$id",
  getParentRoute: () => Route$2
});
const rootRouteChildren = {
  IndexRoute,
  CollectionsIdRoute
};
const routeTree = Route$2._addFileChildren(rootRouteChildren)._addFileTypes();
function getRouter() {
  const router2 = createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true
  });
  return router2;
}
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  Route$1 as R,
  Route as a,
  router as r
};
