<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep editor validation and correction patches in a client-safe module shared with tests; preserve stable references and import provenance when readings change.
- Apply library edits through the authenticated client under existing admin RLS, and paginate full editor reads in bounded requests so imported entries are never silently capped.
