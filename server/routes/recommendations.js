const router=require('express').Router()
const Book=require('../models/Book')
const fetch=global.fetch||require('node-fetch')

const GEMINI_URL='https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const AI_API_KEY=process.env.AI_API_KEY
const MAX_RESULTS=5

const buildPrompt=(books)=>{
  if(!books.length){
    return `You are a helpful reading guide. The user has not logged any books yet.
Suggest 3 to 5 engaging books (include author) and provide a short reason for each.
Respond ONLY with a JSON array like [{"title":"","author":"","reason":""}].`
  }

  const history=books.slice(0,25).map((book,i)=>{
    const rating=typeof book.rating==='number'?`${book.rating}/5`:'unrated'
    const year=book.year||'year unknown'
    return `${i+1}. "${book.title}" by ${book.author} (${year}) - user rating: ${rating}`
  }).join('\n')

  return `You are a helpful reading guide. Based on the user's reading history:
${history}
Recommend 3 to 5 new books the user has NOT read yet. Never reuse titles from the history above. Each recommendation must include a real book title and the author's full name.
Return ONLY a pure JSON array (no markdown) of objects structured as:
[{"title":"","author":"","reason":""}]. Keep reasons under 35 words and do not mention "more like" or similar phrasing.`
}

const tryParseJson=(text='')=>{
  const match=text.match(/```json([\s\S]*?)```/i)
  const payload=match?match[1]:text
  try{
    const parsed=JSON.parse(payload.trim())
    return Array.isArray(parsed)?parsed:[]
  }catch(_){
    return []
  }
}

const parseLooseList=(text='')=>{
  const lines=text.replace(/\r/g,'\n').split('\n').map((line)=>line.trim()).filter(Boolean)
  if(!lines.length) return []

  const blocks=[]
  let current=[]

  for(const line of lines){
    if(/^(#?\d+[\.\)]|[-*])$/.test(line)){
      if(current.length) blocks.push(current)
      current=[]
      continue
    }

    const cleaned=line.replace(/^(#?\d+[\.\)]|[-*])\s+/,'')
    const startsNewBlock=cleaned!==line

    if(startsNewBlock&&current.length){
      blocks.push(current)
      current=[]
    }

    current.push(cleaned)
  }

  if(current.length) blocks.push(current)

  return blocks.map((block)=>{
    if(!block.length) return null
    const[rawTitle,...rest]=block
    const title=rawTitle.replace(/^title[:\-]\s*/i,'').trim()

    let author=''
    let reasonLines=rest
    const firstLine=rest[0]||''
    const looksLikeReason=/because|story|novel|reader|plot|love|war|future|thriller|epic/i.test(firstLine)||firstLine.split(' ').length>10

    if(rest.length&&!looksLikeReason){
      author=firstLine.replace(/^author[:\-]\s*/i,'').replace(/^by\s+/i,'').trim()
      reasonLines=rest.slice(1)
    }

    return {title,author,reason:reasonLines.join(' ').trim()}
  }).filter(Boolean)
}

const sanitizeRecommendations=(entries=[])=>{
  const seen=new Set()
  return entries
    .map(({title='',author='',reason=''})=>({title:title.trim(),author:author.trim(),reason:reason.trim()}))
    .filter(({title})=>{
      if(!title) return false
      const key=title.toLowerCase()
      if(seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0,MAX_RESULTS)
}

const pullTextFromResponse=(payload)=>(
  (payload?.candidates||[])
    .flatMap((candidate)=>candidate?.content?.parts||[])
    .map((part)=>part?.text||'')
    .join('\n')
    .trim()
)

router.get('/',async(_req,res)=>{
  let aiText=''
  try{
    const books=await Book.find().sort({updatedAt:-1})
    if(!AI_API_KEY){
      return res.status(500).json({error:'AI_API_KEY missing. Set it in server/.env and restart the server.'})
    }

    const response=await fetch(`${GEMINI_URL}?key=${AI_API_KEY}`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        contents:[{role:'user',parts:[{text:buildPrompt(books)}]}],
        generationConfig:{temperature:0.6,maxOutputTokens:512,thinkingConfig:{thinkingBudget:0}}
      })
    })

    if(!response.ok){
      const errorBody=await response.text()
      throw new Error(`AI request failed: ${response.status} ${response.statusText} - ${errorBody}`)
    }

    aiText=pullTextFromResponse(await response.json())
    const jsonCandidates=tryParseJson(aiText)
    const structuredCandidates=jsonCandidates.length?[]:parseLooseList(aiText)
    const parsed=sanitizeRecommendations(jsonCandidates.length?jsonCandidates:structuredCandidates)

    if(!parsed.length){
      return res.status(502).json({error:'AI response did not include valid recommendations.',rawOutput:aiText})
    }

    res.json({recommendations:parsed,source:jsonCandidates.length?'ai-json':'ai-structured',rawOutput:aiText,usedBooks:books.length})
  }catch(error){
    console.error('AI recommendation error:',error.message)
    res.status(502).json({error:'Failed to fetch recommendations from AI.',details:error.message,rawOutput:aiText})
  }
})

module.exports=router