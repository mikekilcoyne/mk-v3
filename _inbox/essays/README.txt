Photo essay inbox
=================

Drop one folder per essay in here, named with the URL you want:

    _inbox/essays/how-to-be-happy/
        essay.md          <- the writing
        P1013995.jpg      <- the photos, named so they sort into story order
        P1003575.jpg
        ...

Then run, from the project root:

    node manage-essays.js --dry     (preview)
    node manage-essays.js           (for real)

It optimizes the photos, parses the writing into chapters and text cards,
generates content/essays/how-to-be-happy.json plus the page at
/how-to-be-happy, and moves these originals into _inbox/essays/_done/.

Then open /admin/essays.html to pick photos + set framing, and Save + Deploy.

Re-running on an essay that already exists keeps the photo choices and
focal points you set in the admin panel — only the writing is refreshed.

Full docs: docs/ESSAY_WORKFLOW.md
