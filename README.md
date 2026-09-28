```
deno task dev
```
 deployctl deploy

## Analyzers

Add a `.ts` module under `logic/analyzers/` that implements the `Analysis`
interface and default-exports its analyzer class. The class name is the API
algorithm name, for example `POST /analyze?algorithm=KIAnalysis`. Omitting the
`algorithm` parameter uses `AnalysisBase`. The root endpoint lists available
algorithm names.