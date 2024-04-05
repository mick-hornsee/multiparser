import { serve } from "https://deno.land/std@0.221.0/http/server.ts";
import { multiParser } from 'https://raw.githubusercontent.com/mick-hornsee/multiparser/master/mod.ts'

serve(async (req) => {

  const parsed = await multiParser(req)
  console.log(parsed);


  return new Response(`
  <h3>Deno http module</h3>
  <form action="/upload" enctype="multipart/form-data" method="post">
    <div>singleStr: <input type="text" name="singleStr" /></div>
    <div>Name: <input type="text" name="name" /></div>
    <div>singleImg: <input type="file" name="singleImg"/></div>
    <div>doubleImg: <input type="file" name="doubleImg"/></div>
    <input type="submit" value="Upload" />
  </form>
`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    }
  })

});