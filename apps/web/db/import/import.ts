import { runImport } from "./runner"

runImport().then(code=>{ process.exitCode=code }).catch(error=>{
  console.error(error instanceof Error?error.message:String(error))
  process.exitCode=1
})
