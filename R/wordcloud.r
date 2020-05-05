# url="https://sports.news.naver.com/wfootball/news/read.nhn?oid=109&aid=0003834601" # URL
# install.packages("rvest")
# library(rvest)
# page <- read_html(url,encoding = "UTF-8") # 인코딩 확인하기 
# article <- page%>%html_nodes("#newsEndContents")%>%html_text()
# article


# library(KoNLP)
# text=lapply(article,extractNoun)
# text=unlist(text)

# x <- gsub("[^A-Za-z가-힣[:space:][:digit:][:punct:]]", "", text)
# x <- gsub("@|\n|RT", "", x)
# x <- gsub("[[:punct:]]", " ", x)
# x <- gsub("[[:digit:]]", "", x)
# x <- tolower(x)
# x <- gsub("[a-z]", "", x)

# install.packages("stringr")
# library(stringr)
# x <- str_trim(x)
# x
# library(KoNLP)
# x1 <- lapply(x, extractNoun)
# x2 <- lapply(x1, function(x) x[nchar(x)>1])
# x3 <- do.call(c, x2)
# o <- table(x3)

# library(wordcloud)
# pal <- brewer.pal(8,"Dark2")
# wordcloud(names(o), o, min.freq=3, random.order=F,random.color=T,colors=pal,family="AppleGothic")





library(rvest)
library(RSelenium)
library(httr)
library(stringr)

urlFront <- 'https://search.naver.com/search.naver?&where=news&query=galaxynote9&sm=tab_pge&sort=1&photo=0&field=0&reporter_article=&pd=3&ds=2018.08.07&de=2018.08.12&docid=&nso=so:dd,p:from20180807to20180812,a:all&mynews=0&start=' #News 검색 결과 페이지 앞부분 설정 
urlBack <- '&refresh_start=0'

urls <- NULL
newsData <- data.frame(Header=c(1:40), Link=NA)

ch=wdman::chrome(port=6790L) #크롬드라이버를 포트 4567번에 배정
remDr=remoteDriver(port=6790L, browserName='chrome') #remort설정

for(i in 0:3){
  urls <- paste0(urlFront, i*10+1, urlBack) #News 검색 결과 url
  remDr$open() #크롬 Open
  remDr$navigate(urls) #설정 URL로 이동
  frontPage <- remDr$getPageSource() #페이지 전체 소스 가져오기
  remDr$close() #크롬 Close
  
  newsLinks <- read_html(frontPage[[1]]) %>% html_nodes('._sp_each_title') %>% html_attr('href') #News Link 추출하기
  newsHeaders <- read_html(frontPage[[1]]) %>% html_nodes('._sp_each_title') %>% html_text() #News Header 추출하기
  
  newsData[c((i*10+1):(i*10+10)),'Header'] <- newsHeaders
  newsData[c((i*10+1):(i*10+10)),'Link'] <- newsLinks
}
ch$stop()
write.csv(newsData, "newsSearch.csv")
