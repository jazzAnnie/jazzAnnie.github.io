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




## 실행환경
## 크롬 업그레이드: 83 버전 참고: https://codechacha.com/ko/selenium-chromedriver-version-error/

library(rvest)
library(RSelenium)
library(httr)
library(stringr)

# org code :http://blog.naver.com/PostView.nhn?blogId=nife0719&logNo=221342314551&parentCategoryNo=&categoryNo=30&viewDate=&isShowPopularPosts=false&from=postView
# urlFront <- 'https://search.naver.com/search.naver?&where=news&query=galaxynote9&sm=tab_pge&sort=1&photo=0&field=0&reporter_article=&pd=3&ds=2018.08.07&de=2018.08.12&docid=&nso=so:dd,p:from20180807to20180812,a:all&mynews=0&start=' #News 검색 결과 페이지 앞부분 설정 
# urlBack <- '&refresh_start=0'
# [출처] [R] 베어베어 크롤링 시리즈: 4.네이버 뉴스 검색, 멜론 차트 및 가사 스크래핑하기|작성자 베어베어스

## change code
keyword <-'5%EB%85%84%EC%B0%A8%20%EC%A7%81%EC%9E%A5%EC%9D%B8' #5년차 직장인, URL 인코딩 변환: http://seb.kr/url/
urlFront <- paste0('https://search.naver.com/search.naver?&where=news&query=',keyword,
'&sm=tab_pge&sort=1&photo=0&field=0&reporter_article=&pd=3&ds=2019.01.01&de=2020.05.01&docid=&nso=so:dd,p:from20190101to20200501,a:all&mynews=0&start=') #News 검색 결과 페이지 앞부분 설정 
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
