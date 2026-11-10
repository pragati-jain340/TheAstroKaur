# Add TheAstroKaur context to a ChatGPT Project

1. Open or create your ChatGPT Project for TheAstroKaur.
2. Add `WEBSITE_CONTEXT.md` to its Sources/files area.
3. Add the three PNG files in `screenshots/` individually as visual references. They are existing QA captures from 16 October 2026; replace them when you have newer screenshots.
4. Copy the contents of `PROJECT_INSTRUCTIONS.txt` into the Project's instructions/settings. It does not need to be uploaded as a source as well.
5. Start a new chat inside that Project.

Suggested first message:

> Read WEBSITE_CONTEXT.md and the screenshots. Summarize your understanding of my website's look and current features, separate implemented features from planned or unverified integrations, and tell me what context is still missing. Then suggest the three most useful next improvements without duplicating features I already have.

## Optional sources to add later

- Fresh full-page desktop and phone screenshots in both themes, including About, Vision, footer, and free-reading states.
- Sanitized account/admin screenshots using dummy data, if those areas are relevant.
- A dated release changelog and an explicit list of current priorities.
- Approved service details, brand guidelines, and finalized policies.
- Selected current source files converted to readable text when you need technical help. Include only files needed for the question, with original paths and dates.
- The original brief/specification only if clearly labelled as historical plans; this pack already summarizes the important differences.

Do not upload the entire working folder. Exclude environment files, credentials, customer records, private readings, database dumps, build output, dependencies, and Git history. Do not upload DATABASE.md without checking and removing any real records or sensitive content.

Refresh the context and replace superseded screenshots after significant changes. Project uploads do not automatically mirror the local codebase or deployed site.

Official OpenAI documentation: https://learn.chatgpt.com/docs/projects?surface=app
