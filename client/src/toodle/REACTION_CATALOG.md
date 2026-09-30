# Toodle reaction catalog

This is every act that exists in the app right now. Edit this file to add missing acts or change lines. Nothing here changes behavior until the matching code is updated.

How a message is chosen:

1. Every keyword and phrase is detected. One message can match several acts.
2. A combination beats a single keyword. A stronger level beats a weaker one.
3. Then cooldown, the major-reaction budget, and chance decide whether Toodle actually performs it.
4. If a match loses that roll, Toodle stays quiet. He does not swap in a generic smile.
5. Words `ledu`, `ledhu`, `kaadu`, `kadu`, `no`, `not`, `dont` suppress the act, except `secret` and `cancel`.
6. Serious wording (`sorry`, `died`, `hospital`, `anxiety`, and similar) keeps him quiet.
7. Chaos **Off** shows nothing.

**Plays**

- **Always** means the act skips the chance roll. It can still be quiet because of cooldown or the budget.
- **Chance** is how often it performs after a match. Quiet chaos lowers this. Full chaos raises it, capped at 90%.

**Level**

- **4** major
- **3** contextual
- **2** micro

At most **2** level-3-or-4 acts play per minute, unless the act is marked Always or it is a combination.

Cooldown is per person and per act. A food cooldown does not block study.

---

## Send and reply (not keywords)

| When | What Toodle does | Bubble |
|---|---|---|
| You send a message and no keyword act plays | Short happy bounce, then he stays listening | none |
| The other person is typing | Listening pose | none |
| The other person sends a message and no keyword act plays | Celebrate, then idle | none |
| You tap him once | Pat | Hehe. / Aww. / Thanks. |
| Two taps within 0.9s | Confused | Okay. / Bro. / I felt that. |
| Three taps | Sting, then walk away | OW! then WHY?! / RUDE. |
| Five fast taps | Runaway bit, then he hides for a while | Okay. / You saw nothing. / HAHA. |

If the send has no keyword, the bounce follows the wording:

| Message looks like | Animation |
|---|---|
| good night, gn | sleepy |
| thank, thanks, thx | blush + heart |
| love, ily, miss you, heart emoji | blush + heart |
| lol, lmao, haha, 😂, 🤣 | laugh |
| don't understand, confused, inkenti | confused |
| really?!, wait what, huh, short question | shocked |
| let's go, yay, omg, excited, !!! | celebrate |
| bye, goodbye, see you, cya | wave |
| hi, hey, hello, yo | wave |
| sad, sorry, upset, 😢, 😭 | cry |
| any other question | thinking |
| anything else | happy |

---

## Travel

### trip — Always — level 4 — cooldown 2 min

Keywords: `trip`, `trip ki`, `travelling`, `traveling`, `journey`, `tour`

One of these plays:

- `WAIT. I'M COMING.` run + suitcase, bounce + suitcase, fall
- wink + sunglasses (no line)
- peek + suitcase (no line)
- run + backpack (no line)
- spin + suitcase (no line)

### plan — Chance 22% — level 4 — cooldown 2 min

Keywords: `plan`, `plan enti`, `plan cheddam`, `plan cheddhama`, `plan undha`, `plan unda`

Bubble: `Operation: Weekend.`

### cancel — Always — level 4 — cooldown 2 min

Keywords: `cancel`, `cancelled`, `canceled`, `plan cancel`, `plan cancel ayindi`, `cancel ayindi`

Bubble: `All that planning...` then a fall.

### bike — Always — level 3 — cooldown 2 min

Keywords: `bike`, `scooty`, `scooter`, `ride`, `riding`, `bike meedha`, `scooty meedha`

Bubble: `Helmet first bro.` then run, then peek.

### otw — Chance 22% — level 3 — cooldown 2 min

Keywords: `rapido`, `otw`, `on the way`, `coming`, `vastunna`, `vastunnanu`, `vasthunna`, `vasthunnanu`

Bubble: `2 mins bro.` then run + helmet.

### outside — Always — level 3 — cooldown 2 min

Keywords: `bayataki veltham`, `bayataki veldham`, `bayataki velthaam`, `bayatakeltham`, `bayataki velthunnam`, `going out`, `outside`

Bubbles: `Phone.` then `Wallet.` then walk away.

---

## Food

### food — Always — level 3 — cooldown 1.5 min

Keywords: `thinnava`, `tinnava`, `thinnavaa`, `tinnavaa`, `tinava`, `thinnanu`, `tinnanu`, `thintunna`, `tintunna`, `food`, `lunch`, `dinner`

Bubble: `Nannu adagaledu?`

### food-again — Chance 70% — level 3 — cooldown 1.5 min

When: the same person says a `thinnava`-type word for the 5th time in 10 minutes.

Bubble: `Again? 😂`

---

## Health

Doctor, fever, and headache share the same performance.

### doctor — Always — level 4 — cooldown 2.5 min

Keywords: `doctor`, `doctor ki`, `hospital`

### fever — Always — level 4 — cooldown 2.5 min

Keywords: `fever`, `jwaram`, `jvaram`, `sick`

### headache — Always — level 4 — cooldown 2.5 min

Keywords: `headache`, `head pain`, `head noppi`, `thala noppi`, `tala noppi`

Bubble for all three: `Doctor Toodle reporting.` then a suspicious look + notebook.

---

## Office and study

### deadline — Always — level 4 — cooldown 2 min

Keywords: `deadline`, `urgent`, `tomorrow`, `submission`

Bubble: `WE HAVE HOW LONG?!`

### office — Chance 20% — level 3 — cooldown 2 min

Keywords: `office`, `ofc`, `work`, `meeting`, `client`, `boss`, `manager`

Bubble: `Corporate life.`

### study — Always — level 3 — cooldown 2 min

Keywords: `chadhuvkovali`, `chaduvkovali`, `chadhuvukovali`, `chaduvukovali`, `chadhuvukuntunna`, `chaduvthunna`, `chaduvutunna`, `chadhuvkunta`, `chaduvkunta`, `chadhuvkunna`, `chaduvkunna`, `chadhuvkuntunna`, `chaduvkuntunna`, `chadhuvkutunna`, `chadhuvukunta`, `study`, `studying`, `preparation`, `prepare`

Bubble: `Focus bro.` then sleepy + book.

### exam — Always — level 3 — cooldown 2 min

Keywords: `exam`

Same performance as study.

---

## Comedy

### secret — Always — level 4 — cooldown 3 min

Keywords: `secret`, `secret cheptha`, `secret chepta`, `secret chepptha`, `secret chepthaanu`, `secret chepthanu`, `evariki cheppaku`, `evvariki cheppaku`, `dont tell anyone`, `don't tell anyone`

`chepta` alone does not match. It needs `secret` with it.

Bubble: `I'm listening... 👀` after glasses and a notebook.

### birthday — Always — level 4 — cooldown 3 min

Keywords: `birthday`, `bday`, `puttinaroju`, `puttina roju`

Bubble: `PARTYYYY 🎉` then dance.

### movie — Always — level 3 — cooldown 1.5 min

Keywords: `movie`, `cinema`, `theatre`, `theater`, `movie ki veldham`, `movie ki veldhama`, `cinema ki`

Bubble: `I'm seated.` then sleepy + popcorn.

### cool — Chance 12% — level 2 — cooldown 1.5 min

Keywords: `cool`, `nice`, `super`, `awesome`, `mass`, `wow`

No bubble. Wink + sunglasses, then walk away.

### enough — Chance 30% — level 2 — cooldown 1.5 min

Keywords: `enough`, `enough ra`, `chaalu`, `chalu`, `stop`, `aapey`, `apey`

Bubble: `Okay okay.` then sleepy.

---

## People

### pspk — Always — level 3 — cooldown 2 min

Keywords: `pawan kalyan`, `pspk`, `power star`

Bubble: `Jai!`

### megastar — Always — level 3 — cooldown 2 min

Keywords: `megastar`, `chiranjeevi`, `chiru`

Bubble: `Boss.`

### amma — Always — level 2 — cooldown 1.5 min

Keywords: `amma`, `ammaa`, `mummy`

Bubble: `Amma.`

### nanna — Always — level 2 — cooldown 1.5 min

Keywords: `nanna`, `naanna`

Bubble: `Nanna.`

---

## Compliments, warmth, name

### best — Always — level 2 — cooldown 2 min

Keywords: `nekey best`, `neeke best`, `neekey best`, `neeku best`, `nee key best`

Bubble, one of: `Obviously. 😌` / `Finally, someone noticed.` / `I knew it.`

### bavundhi — Always — level 2 — cooldown 2.5 min

Keywords: `bavundhi anna`, `baavundhi anna`, `bagundhi anna`, `baagundhi anna`, `bavundi anna`, `bagundi anna`

`anna` is optional in matching. `baagundhi` alone can still hit this.

Bubble, one of: `Aww. Thanks anna. 🥹` / `Nijamgaa? 👀`

### strong-compliment — Always — level 3 — cooldown 3 min

Keywords: `nijamgaaney bavundhi`, `nijamgaane bavundhi`, `nijamgane bavundhi`, `nijamga bavundhi`, `nijamgaaney bagundhi`, `nijamgaane bagundhi`, `nijamgane bagundhi`, `nijam gane bavundhi`, `really bavundhi`, `really good`, `actually good`

Bubbles: `Nijamgaa? 🥹` then `Okay... I'll remember this.`

### happy-ga — Always — level 2 — cooldown 2 min

Keywords: `happy ga undu`, `happyga undu`, `happy ga undu ani`

Bubble, one of: `You toooo ❤️` / `Always 😌` / `Trying my best.` / `Happy mode ON.`

### enjoy — Always — level 2 — cooldown 1.5 min

Keywords: `enjoy`, `enjoy enjoy`, `enjoy ra`, `enjoy bro`

Bubble, one of: `ENJOY ENJOY 😎` / `Absolutely.` / `Carry on.` / `Full enjoy mode.`

### enjoy-again — Chance 70% — level 2 — cooldown 1.5 min

When: `enjoy` shows up again after 3 enjoys in 10 minutes.

Bubble: `Okay okay, ENJOY ENJOY understood 😂`

### name — Always — level 3 — cooldown 40 sec

Keywords: `toodle`, `toodles`, `hey toodle`, `hey toodles`, `oi toodle`, `oye toodle`, `listen toodle`, `toodle bro`

Bubble, one of: `Nannu emaina pilichaaraa?` / `Haan? 👀` / `Cheppu.` / `I'm listening.` / `Yes?`

### name-ask — Always (combination) — level 3 — cooldown 40 sec

When: the message is basically his name plus `?` and no `bro`. Example: `toodle?`

Bubbles: `Nannu emaina pilichaaraa?` / `Nannu kaadhaa?` / `Okay okay. 😌`

### name-bro — Always (combination) — level 3 — cooldown 40 sec

When: his name and `bro` are in the same message. Example: `toodle bro`

Bubbles: `Nannu pilichaaraa?` then `Also... who is bro here? 😭`

### name-compliment — Always (combination) — level 3 — cooldown 1 min

When: his name is in the same message as a compliment (`best`, `bavundhi`, or a strong compliment).

Bubble: `Nijamgaa? 🥹`

### name-follow — Chance 70% — level 2 — cooldown 15 sec

When: within 20 seconds after a name call, the next message is a compliment, warm line, `em chestunav`-type question, or contains `?`.

Bubble: `Cheppu 👀`

### name-shrug — Chance 65% — level 2 — cooldown 15 sec

When: within 20 seconds after a name call, the next message changes the subject.

Bubbles: `Oh... nannu kaadhaa.` then `Okay okay.`

---

## Telugu questions

### doing — Always — level 2 — cooldown 1.5 min

Keywords: `em chesthunnav`, `em chestunnav`, `em chestunav`, `em chesthunnavu`, `em chestunnavu`, `em chesthav`

Bubble: `Nenu? Chill.` with a random pose (happy, dance, sleepy, thinking, or peek).

### where — Always — level 2 — cooldown 1.5 min

Keywords: `ekkadunnav`, `ekkada unnav`, `ekkad unnav`, `ekkadunnavu`, `ekada unnav`

Bubble: `Ikkaade.`

### wellbeing — Always — level 2 — cooldown 1.5 min

Keywords: `ela unnav`, `ela unnava`, `bagunnava`, `bavunnava`, `baagunnava`

Bubble, one of: `Super.` / `Surviving.` / `Don't ask.`

---

## Romance

### romance — Chance 16% — level 4 — cooldown 3 min

Keywords: `crush`, `cute`, `handsome`, `beautiful`, `love`, `like her`, `like him`

Bubble: `Ohhh... 👀` then peek, then walk away.

### heroine — Chance 16% — level 4 — cooldown 3 min

Keywords: `hero`, `heroine`

Same blush performance as romance.

---

## Combinations

These win over the single keywords when every category is present in the current message or the last few messages. One of the categories must be in the current message. They play without the chance roll. Cooldown is 1.5 min. Level 4.

| Act | Needs | Bubble |
|---|---|---|
| trip-plan-cancel | trip + plan + cancel | `All that planning...` |
| trip-cancel | trip + cancel | `All that planning...` |
| trip-plan | trip + plan | `Operation: Weekend.` then the trip suitcase bit |
| movie-cancel | movie + cancel | no line, shocked then fall |
| deadline-panic | office + deadline | `WE HAVE HOW LONG?!` |
| exam-panic | study + exam | `Focus bro.` then sleepy |
| rapido-driver | bike/ride + otw | `2 mins bro.` Example: `bike meedha vastunna` |
| romantic-blush | romance + hero/heroine | `Ohhh... 👀` |
| sick-office | fever + office | no line, confused + coffee. Example: `fever undhi office ki vellali` |
| headache-office | headache + office | same confused bit |

---

## Okay, hmm, bro, dry replies

One `bro` does nothing. One `ha` after a question stays quiet. These acts need the message to be only that word, unless the row says otherwise.

### double-okay — Chance 50% — level 2 — cooldown 25 sec

When: the message is only `ok` / `okay` / `okai` / `okk` / `sare` / `sari`, twice or more. Stretched letters count. Example: `okai okai`

Bubble: `Okay. Okay.` If okay has already been said 6 times: `We got it.`

### okay-tired — Chance 75% — level 2 — cooldown 1 min

When: four or more okays in one message.

Bubble: `BRO. WE UNDERSTOOD.`

### stretch-okay — Chance 22% — level 2 — cooldown 30 sec

When: one stretched okay. Example: `okayyy`, `okaii`

Bubble: `👍👍`

### vake-okay — Chance 20% — level 2 — cooldown 40 sec

When: `vakey`, `vakai`, or `vake`, once or twice.

No bubble. A small happy beat.

### okay-count — Chance 65% — level 2 — cooldown 1.5 min

When: a single okay crosses 5 uses in 10 minutes, and the message is not a double okay.

Bubble: `Okay counter 📈`

### okay-strong — Chance 80% — level 2 — cooldown 1.5 min

When: a single okay crosses 8 uses.

Bubble: `Okay counter: 8` (the number is the count)

### hmm-look — Chance 12% — level 2 — cooldown 2 sec

When: the first `hmm` / `hmmm` / `hmmmm` in 3 minutes.

Bubble: `Hmm?`

### hmm-side — Chance 40% — level 2 — cooldown 2 sec

When: the second hmm.

Bubble: `What does that mean? 👀`

### hmm-loop — Chance 55% — level 2 — cooldown 4 sec

When: the third hmm.

Bubble: `Hmm... hmm... hmm...`

### hmm-snap — Chance 65% — level 2 — cooldown 8 sec

When: the fourth hmm.

Bubble: `BRO WHAT ARE YOU THINKING 😭`

### hmm-lore — Chance 75% — level 3 — cooldown 30 sec

When: the sixth hmm.

Bubble: `JUST SAY IT MAN 😭` or `This "hmm" has lore.`

### ha-look — Chance 8%, or 34% if stretched (`haaa`) — level 2 — cooldown 8 sec

When: one `ha` and fewer than 3 dry replies so far.

A short `ha` has no bubble. A stretched `haaa` says `Okay...`

### dry-streak — Chance 45% — level 2 — cooldown 12 sec

When: 3 or more dry one-word replies in 3 minutes. Dry words: `ha`, `hmm`, `oh`, `k`, `ya`, `yeah`, `ye`, `ok`, `okay`, `okai`.

Bubble: `Bro... are you interested? 😭`
At 5 or more: `Bro's conversation battery is at 2%. 🔋😭`

### dry-mix — Chance 60% — level 3 — cooldown 20 sec

When: at least 3 dry replies and they are mixed kinds (hmm plus ha, or two different dry words).

Bubble: `Bro... are you interested? 😭`

### fake-bye — Chance 80% — level 3 — cooldown 45 sec

When: 5 dry replies, or a mixed dry streak that includes okay, or a long message followed by 4 mixed dry replies. A single `ha` answering a question does not start this.

One of:

- `Aren't you interested then? 😭`
- `Okay bro, I'll stop talking.`
- `Clearly you're busy. Bye. 👋`
- `Okay okay, I'll leave.`
- `Fine. Don't listen then.`
- `Interesting way to say 'I don't care.' 😭`
- `Bro is replying with one-word DLC.`
- `That's it? 😭`
- `Your enthusiasm is inspiring.`
- `Okay... I'll just disappear.`
- `Carry on. I'm apparently talking to myself.`
- `Fine. BYE MAN.`

Then `Bye man. 👋`, then `Actually, continue. 👀`

### bro-who — Chance 50% — level 2 — cooldown 12 sec

When: `bro` / `broo` / `bruh` / `brah` crosses 3 uses in 10 minutes.

Bubbles: `Who is bro here?` then `Oh... me?`

### bro-name — Chance 70% — level 3 — cooldown 12 sec

When: bro crosses 5 uses.

Bubble: `I HAVE A NAME 😭`

### bro-siblings — Chance 80% — level 3 — cooldown 20 sec

When: bro has been used 8 times and appears again.

Bubble: `I have enough brothers and sisters already.`

### bro-burst — Chance 75% — level 3 — cooldown 20 sec

When: one message is only bro, three or more times. Example: `bro bro bro`

Bubbles: `Who is bro here?` / `Oh... me?` / `I have enough brothers and sisters already.`

### cheppu — Chance 70% — level 2 — cooldown 1.5 min

When: `cheppu` / `chepu` crosses 5 uses in 10 minutes.

Bubble: `CHEPPU.`

---

## Rare chat moments

These are not keyword acts. They fire from chat events, and most of them are rare. Chaos Quiet often hides the line. A serious chat blocks anything below priority 75.

| When | Chance | Cooldown | Bubble, one of |
|---|---|---|---|
| Chat opens | 35% | 10 min | `Here we go...` / `I will just sit here.` / `Say something unhinged. I dare you.` |
| Typing for more than 7 seconds | 25% | 2 min | `Bro is writing a thesis.` / `That is a suspiciously long sentence.` / `You good in there?` / `I can hear the keyboard fighting for its life.` / `Thinking...` / `Thinking harder...` / `Okay Shakespeare.` |
| A draft is deleted and rewritten twice | 30% | 1.5 min | `Just send it bro.` / `The message has entered its editing era.` / `Draft #17 loading...` / `You could have just said hey.` / `Bro deleted the entire autobiography.` |
| 3 of your messages within 10 seconds | 45% | 80 sec | `Whoa whoa WHOA.` / `Bro came prepared.` / `Machine gun texting activated.` / `Someone had things to say.` |
| Chat idle 4 minutes | 40% | 15 min | `So... we just do not talk now?` / `I will just sit here then.` / `This conversation has entered airplane mode.` / `Hello? Anybody home?` / `The vibes have left the building.` |
| Chat active 20 minutes | 45% | 20 min | `Y'all are STILL here?` / `At this point I am basically part of the relationship.` / `I have witnessed too much.` / `Should I leave you two alone?` / `You two could have just called.` |
| Same word said 4, 8, or 14 times | 70% | 3 min | `bro counter is climbing.` / `You really like the word "bro" huh?` / `New vocabulary unlocked: bro.` / `You have said "bro" 4 times.` A **Use this** swap is offered for some words (see below). |
| "5 minutes" or "five minutes" | 80% | 10 min | `5 minutes detected. Historically, this means 27 minutes.` |
| Streak goes up, day 1 | 90% | 1 min | `Okayyy, we started something.` |
| Streak 3+ | 90% | 1 min | `Look at you two.` |
| Streak 7+ | 90% | 1 min | `SEVEN DAYS?!` |
| Streak 30+ | 90% | 1 min | `I think I am emotionally invested now.` |
| Streak at risk | 75% | 30 min | `THE STREAK. PLEASE.` / `I am not saying it is over... but it is looking suspicious.` |
| Mood text changes | 80% | 30 sec | See mood lines below. Unknown mood: `Mood noted. I am watching.` |
| Conversation has 5 minutes left | 80% | 10 min | `Uhh... we are running out of time.` / `Just saying... you could renew this.` / `5 minutes left.` |
| GIF or sticker | 18% | 45 sec | no line, bounce |
| Emoji-only message | 20% | 25 sec | no line. 😂😭 laugh, hearts blush, 💀 fall, 🔥 chaotic, 👀 suspicious |
| Message longer than 280 characters | 22% | 1.5 min | no line |
| 100 messages | 85% | 1 hour | `100 messages.` / `You could have sent an email.` / `I have taken notes. They are unhelpful.` |
| A shortcut is used | 28% | 2 min | `Shortcut spotted.` / `Cheater. I respect it.` |
| good night / goodnight / gn | 70% | 10 min | `Blanket acquired.` |

Word swaps offered on a repeated word:

| Word | Suggested replacement |
|---|---|
| bro | my distinguished gentleman |
| okay, ok | Understood, captain. |
| nice | absolutely magnificent |
| yes | absolutely |
| no | respectfully, nope |
| lol | I am deceased |
| lmao | I have perished |
| hey | greetings, human |
| yeah | indeed |
| fine | spectacular, actually |
| what | elaborate, please |
| idk | the mystery continues |
| omg | good heavens |
| love | I am fond of you, formally |
| hi | salutations |
| cool | extraordinarily acceptable |
| sure | consider it done |

Mood lines:

| Mood | Bubble |
|---|---|
| bored | Bored? That is literally my department. |
| surviving | Respect. |
| questionable decisions | Oh no. |
| sleepy | Go to bed. |
| cooking | CHEF MODE. |
| watching | Same. |
| dead inside | I will lie down with you. |
| overthinking | And we are back. |
| in love | I saw nothing. |
| barely alive | Blink twice if you need water. |

Occasional listen lines, only after a burst of messages or a long quiet stretch. Chance is low.

`I'm listening... 👀` / `Hoo...?` / `Really?` / `Wait.` / `Go on...` / `Interesting...` / `Okayyy...` / `I'm not judging.` / `Suspicious.` / `I heard that.` / `I need context.` / `WHAT?` / `Sure bro.`

---

## Add a missing act

Copy this block, fill it in, and leave it in this file.

```
### id — Always or Chance __% — level 2 / 3 / 4 — cooldown __

Keywords:

When (if it needs earlier messages, not just this one):

Bubble:

Animation:

Notes:
```
