Today the project has been created by agents which means it's quite easy to get messy and not follow best practises in many areas.

I'm going to do a full audit of the codebase here and put any points that sould be improved.

# server

## http

### authentication

- auth scopes should not be in different file - we can have one centralised location where all are stored
- right now utils and helper methods are in the same files as business logic which makes the business logic harder to understand - can we instead extract these utils into their own files - might be worth having a cleaner folder structure here to facilitate this as well
- for hte code block below

```typescript
const organizationId =
  yield *
  organizationOf(userId.value).pipe(
    Effect.mapError(() => unauthorized("Could not resolve the organization")),
  );
```

shouldn't this error hanlding occur in the survice itself --- or is the correct layer, to me it seems a bit frustrating that we have to handle this on our side in this method, also I don't really like the `organizationOf` type syntax -- I think in general the `xyzOf` methods are very messy and it's difficult to understand what's actually happening here

- I think the `README.md` in `http/authentication` is nice but wonder if there's a better place to store these docs like some clean internal documentation folder? And then we can have a skill to help resolve docs across the codebase -- I think having this in a centralised location could make more sense here.

- I don't know the unit etc here `ROLE_CACHE_CAPACITY` I think this can be cleaned up? These consts can be handled in a cleaner way as well as oppose to just dotted at the top of the file - maybe an effect config - can we think carefully here about the best way we can handle this?

- Same with `RoleKey` and `AdminField` types -- it's just a bit messy to have these dotted at the top of the file?

- same ideas as already mentioned apply to `verified-keys.ts` - I'm thinking that maybe it's better to have services/layers/utils/config all cleanly separated here as it feels quite messy at the moment - we can think about the file structure here as well

### authorization

- again could be multiple files -- do we need such complexity with the type as well, like that it's derived/dry but wonder if there's a cleaner way we can do this?

### request

- auth route should be in a clean nested util here? is this prefix shared and dry with the `auth` package as well? should it instead be imported

- `authentication-challenge.ts` again looks like a util, is there no built in way to do this cleaner was well?
- overall looks like the folder structure could be improved here and we can structure this better so that it's cleaner the scope of everything etc - think carefully about this one

- `prompt-errors.ts` feels off as well -- feels like if we're going to be used here we can put in a package -- where are errors stored for other bits of application logic? can we centralise this and dry it up?

## routes

### evals

- `artifacts.ts` looks again a bit custom and that it could be more consistent in some way
- `operationsts` looks like it's handling quite a lot -- again a common theme here is to split into different files and have hierarchical file structure here so that everything is more digestable -- again helps here if we have clean utils which can then be shared between relevant files that consume this logic

### internal

#### activity

- looks good not sure if we need the inline jsdoc tho - seems contextual, in this case we should remove all contextual comments -- if something doesn't explain why some thing exist/decisions outside of the context of an LLM then we can keep if it's clean, can we make `withPromptErrors` more generic here as well

- otherwise the rest of the `handlers.ts` files look reletively clean -- could have one file per endpoint with a cleaner structure but otherwise it's looking pretty good. I do think in `credentials/hanlders.ts` for example it's quite messy with `apiError` etc at the top of the file - the names of the methods should be more descriptive and these utils shouldn't be in the same file as the rest of the handler

#### evals

- this should again be more hierachical with the file structure as this looks very messy right now with how things are currently

- also for `authPath` why is the codex bit hardcoded -- is this as clean as possible it's not making a lot of sense?

- `asStoredTrial` looks pretty messy as well - could this not be using effect schema?
- again the main thing here is that the layout/files can be a lot cleaner and more digestable -- the tests should also be in /tests not /src and then the test path should follow the path in src for a file -- having the `.test.ts` files here are very messy
- again `asXyz` and `xyzOf` are just so lazy and these should be more explicit

### public

- looks clean but file structure can be improved

# sandbox bridge

- this doesn't need to be it's own app? we can clean this up a lot?

# vite

- file structures in lib etc can be much more hierarchical and clean -- we should go deep here an validate that in each case everything is clean and digestable and that we need absolutely everything here -- right no there is a lot of hooks etc -- we should cleanly split into mutations/helpers/utils etc -- delete anything not being used

- tests again should be in /tests not /src

---

now going over the packages

# auth

## credentials

- for the time values here can we use effect duration or clean this up?

## organization

- this looks pretty messy, make sure everything is using clean schema and that we have a clean hierarchical structure -- not everything has to mention organization in the file name

## sesison

- same thing with effect duration

- in `auth.ts` we can use effect duration and make sure it's as clean as possible -- overall this package looks pretty clean

# eval

- wow this is going to need a lot of cleanup especially with the file structure here -- needs to be much more hierarchical and the tests need to all be in /tests not /src

## adapters

### harness

- all the schema should be in the schema pacakge with a clean hierarchy
- again `Of` syntax is really bad here -- make it clear
- should defo have own dirs for different harnesses here, with clean files like `BIN` should be in a config file in the claude foler etc -- we can make this much cleaner
- the same ideas can be applied to all harnesses here -- think some bits can be more effect pilled and generally just a bit cleaner - main thing is the business logic is very hard to follow so all of the utils etc should be extracted into clean helper files rather than at the top of the business logic with verbose jsdoc.
- we should look at doing a full cleanup here applying the principles from the initial feedback to all harnesses

### models,runner,sandbox,scorers

- same ideas as `harness` here lets use the same feedback and cleanup

## rest of evals

- can we apply the same general feedback here, overall everything should be extracted into clean flies in a hierchical structure -- keep it as dry and centralised as possible there's just a lot to process here so we should ensure this is very very strctured and clean - no unneeded jsdoc



# prompts

- again similar feedback
- if we don't use anything or something is overcomplicated we can safely delete

# schema

- we need to again make this much more structured and grouped and hierarchical in the file system -- can do a major cleanup here as well

# sdk

- same feedback that's already been mentioned should be applied in full here so that it's very clean and dry
