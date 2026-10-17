# Altitude: worked example

Scenario: an everyday office task. You are at Acme Inc, an imagined company, and need to put together the deck for the quarterly business review (QBR). You have a pile of data, and perhaps a template that only needs filling in. Each step below is more ambitious than the last.

## Step 1: understand the business, not the template

Most reviews want to know what changed this quarter, why it changed, and what should be done about it. Do not just update the numbers in the template. Give the model as much data as you can, so it understands the business.

> Tell me what changed this quarter, why, and what we should do about it.

## Step 2: end with decisions

Good meetings end with decisions. Ask the model to work out which decisions matter most given everything it has learned, and to start on each direction, with arguments for and against.

> Work out which three decisions are most urgent in the face of everything you've learned, and start working on potential directions with for/against arguments.

## Step 3: question the artifact itself

QBRs come from a time when humans had to sift through data, work out what it meant, and decide whether the business should adjust. The review exists so leadership catches problems early and moves money and people to the right places. Ask whether a better mechanism exists for that purpose.

> The review exists so leadership catches problems early and moves money and people to the right places. Design a better way to do that than a quarterly deck, show from our own history that it would have caught things sooner, and run it beside the current one for a quarter.

## Notes on altitude

- Altitude works best when you are after a concrete ultimate outcome. It works less well for creative endeavors.
- A tell-tale sign that altitude applies: you would normally schedule meetings to discuss the work.
- Current limits: "Claude, go make money" does not work for most businesses by itself. Models appear to handle higher levels of abstraction as they become more capable.
- Durable workflows take the human out of the loop, so you do not have to update the model with each new task. Building one often requires changing your workflow. Example: to have the model keep an app crash-free, first make sure it can fetch crash reports, understand which app version maps to which commit, and access Windows, macOS, and Linux machines so it can independently reproduce and verify fixes.
