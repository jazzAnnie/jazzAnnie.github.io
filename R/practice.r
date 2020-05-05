data(mtcars)
head(mtcars)

install.packages("ggplot2")
library(ggplot2)
# x축은 wt, y축은 mpg, 데이터는 hp인데 컬러 포인트로 보임
p <- qplot(wt, mpg, colour=hp, data=mtcars)
# y축의 좌료는 0부터 40까지
p + coord_cartesian(ylim=c(0, 40))
# hp의 범위는 100부터 300까지 
p + scale_colour_continuous(breaks=c(100, 300))
# 범례는 색깔바로 표시
p + guides(colour="colourbar")


m <- mtcars[1:10, ]
# 1부터 10까지 데이터를 추출해서 p라는 그래프에 m을 적용한다.
p %+% m

# 막대 그래프
c <- ggplot(mtcars, aes(factor(cyl)))
c + geom_bar()
c + geom_bar(fill="red")
c + geom_bar(colour="yellow")
c + geom_bar(fill="white", colour="red")

k <- ggplot(mtcars, aes(factor(cyl), fill=factor(vs)))
k + geom_bar()

# 히스토그램
# m <- ggplot(movies, aes(x, rating))
# m + geom_histogram()
# m + geom_histogram(aes(fill=..count..))

# ecnomics는 ggplot2패키지 않에 있다 사용하려면 ggplot2를 먼저 로드해야 한다.
data(economics)
head(economics)

b <- ggplot(economics, aes(x=date, y=unemploy))
b + geom_line()
b + geom_line(colour="red")
b + geom_line(colour="red", size=3)
b + geom_line(linetype=2)

# 효과주기  평균이 0, 표준편차가 1인 정규분포를 만드는 난수를 5000개씩 생성
df <- data.frame(x=rnorm(5000), y=rnorm(5000))
h <- ggplot(df, aes(x,y))
h + geom_point()
h + geom_point(alpha=1/10)

p <- ggplot(mtcars, aes(wt, mpg))
p + geom_point(size = 4)
p + geom_point(aes(colour=factor(cyl), size=4))
p + geom_point(aes(shape=factor(cyl), size=4))

# reshape2 패키지: 데이터를 다양한 구조로 가공하는 도구
install.packages("reshape2")
library(reshape2)

install.packages("plyr")
library(plyr)

rescale01 <- function(x)(x- min(x)) / diff(range(x))
ec_scaled <- data.frame(
    date = economics$date,
    colwise(rescale01)(economics[, -(1:2)])
)
# melt함수를 쓰기위해서는 reshape 패키지 우선 설치
install.packages("reshape")
library(reshape)
ecm <- melt(ec_scaled, id="date")

f <- ggplot(ecm, aes(date, value))
f + geom_line(aes(linetype=variable))

data(diamonds)
head(diamonds)

k <- ggplot(diamonds, aes(carat, ..density..)) + geom_histogram(binwidth=0.2)
k + facet_grid(. ~ cut)

w <- ggplot(diamonds, aes(clarity, fill=cut))
w + geom_bar()
w + geom_bar(aes(order=desc(cut)))

df <- data.frame(x=1:10, y=1:10)
f <- ggplot(df, aes(x=x, y=y))
f + geom_line(linetype=2)
f + geom_line(linetype='dotdash')

data(mtcars)
p <- ggplot(mtcars, aes(wt, mpg))
p + geom_point(size=4)
p + geom_point(aes(size=qsec))
p + geom_point(size=2.5) + geom_hline(yintercept=25, size=3.5)
p + geom_point(shape=5)
p + geom_point(shape='k', size=3)
p + geom_point(shape=".")
p + geom_point(shape=NA)

df2 <- data.frame(x=1:5, y=1:25, z=1:25)
s <- ggplot(df2, aes(x=x, y=y))
s + geom_point(aes(shape=z), size=4) + scale_shape_identity()

dmod <-lm(price ~ cut, data=diamonds)
cuts <- data.frame(cut=unique(diamonds$cut), predict(dmod, data.frame(cut=unique(diamonds$cut)), 
                    se=TRUE)[c("fit", "se.fit")])
se <- ggplot(cuts, aes(x=cut, y=fit, ymin=fit-se.fit, ymax=fit+se.fit, colour=cut))                   
se + geom_pointrange()

data(mtcars)
p <- ggplot(mtcars, aes(wt, mpg)) + geom_point()
p + annotate("rect", xmin=2, xmax=3.5, ymin=2, ymax=25, fill="dark grey", alpha=.5)

q <- ggplot(mtcars, aes(wt, disp)) + geom_point()
q + geom_smooth()
# 그래프가 제대로 보이지 않음
q + scale_x_continuous(limits=c(325,500))

d <- ggplot(diamonds, aes(carat, price))
d + stat_bin2d(bins=25, colour="grey50")

# 제대로 그려지지 않음, 함수 사용 다시 봐야함
d + scale_x_continuous(limits=c(0,2))

qplot(cut, price, data=diamonds, geom="boxplot")
last_plot() + coord_flip()

qplot(cut, data=diamonds, geom="bar")

# 여러개의 축을 그리기
time <- seq(7000, 3400, -200)
pop <-c(200,400,450,500,300,100,400,700,830,1200,400,350,200,700,370,800,200,100,120)
grp <-c(2,5,8,3,2,2,4,7,9,4,4,2,2,7,5,12,5,4,4)
med <-c(1.2,1.3,1.2,0.9,2.1,1.4,2.9,3.4,2.1,1.1,1.2,1.5,1.2,0.9,0.5,3.3,2.2,1.1,1.2)
par(mar=c(5,12,4,4)+0.1)

# 그래프 모양 그리기
plot(time, pop, axes=F, ylim=c(0, max(pop)), xlab="", ylab="", type="l", col="black", main="", xlim=c(7000,3400))
# 그래프에 점을 찍기
points(time,pop, pch=20, col="black")
# 그래프에 y축을 그려주기
axis(2, ylim=c(0,max(pop)), col="black", lwd=2)
# y축에 이름을 붙이기
mtext(2, text="Population", line=2)
# 두번째 그래프 그리기  - 실행이 안됨
par(new=T)
plot(time, med, axes=F, ylim=c(0, max(med)), xlab="", ylab="", type="l", lty=2, main="", xlim=c(7000,3400),lwd=2)
# 두번째 그래프에 y축 그리기
axis(2, ylim=c(0,max(med)), col="black", lwd=3.5)
# 두번째 그래프에 점을 찍기
points(time, med, pch=20)
# 두번째 그래프의 y축에 이름을 붙이기
mtext(2, text="Median Group Size", line=5.5)
# 세번째 그래프 그리기 - 실행이 됨
par(new=T)
plot(time, grp, axes=F, ylim=c(0, max(grp)), xlab="", ylab="", type="l", lty=3, main="", xlim=c(7000,3400), lwd=2)
# 세번째 그래프에 y축 그리기
axis(2, ylim=c(0, max(grp)), lwd=2, line=7)
# 세번째 그래프에 점을 찍어주고, y축에 이름을 붙이기
points(time, grp, pch=20)
mtext(2, text="Number of Groups", line=9)
# x축을 만든 후 이름을 붙이기
axis(1, pretty(range(time),10))
mtext("cal BP", side=1, col="black", line=2)
# 라인별로 설명을 붙이기
legend(x=7000, y=12, legend=c("Population", "Median Group Size", "Number of Groups"), lty=c(1,2,3))


install.packages("googleVis")
library(googleVis)

data(Fruits)
head(Fruits)

M1 <- gvisMotionChart(Fruits, idvar="Fruit", timevar="Year")
plot(M1)
 
#googleVis 라이브러리 설치 및 호출
install.packages("googleVis")
library(googleVis)
 
#변수 지정    val1=해당 값1   val2=해당 값2
student=data.frame(database=c("kor", "en", "math"), stu1=c(80, 95, 75), stu2=c(65, 80, 100))
#Column차트 지정
Column <- gvisColumnChart(student)
#plot 안에 chart 지정 변수 불러오기
plot(Column)

# 변수 지정    val=해당 값
air=data.frame(database=c("Nitrogen", "Oxygen", "Argon", "Other"), val=c(78.08, 20.95, 0.93, 0.04))
 
# Pie차트 지정
Pie <- gvisPieChart(air)
 
# plot 안에 chart 지정 변수 불러오기
plot(Pie)


출처: https://codeomni.tistory.com/122 [codeomni]


data(Exports)
head(Exports)

# 세계지도 상에서 국가별 수출 수익 크리 색상 구분
G1 <- gvisGeoChart(Exports, locationvar="Country", colorvar="Profit")
plot(G1)

# 유럽지역으로 한정하여 그리기
G2 <- gvisGeoChart(Exports, "Country", "Profit", options=list(region="150"))
plot(G2)

# 미국 주별 문맹률 정보를 나타내기
require(datasets)
states <- data.frame(state.name, state.x77)
head(states)

G3 <- gvisGeoChart(states, "state.name", "Illiteracy", options=list(region="US", displayMode="regions",
resolution="provinces", width=600, height=400))
plot(G3)

# 도시별 인구 데이터
data(CityPopularity)
head(CityPopularity)
# 색깔로 표시되는 부분이 화면에 표시가 안됨
# colors 부분에 문제가 있음
G4 <- gvisGeoChart(CityPopularity, locationvar="City", colorvar="Popularity", options=list(region="US",
height=350, displayMode='Markers', colorAxis="{values:[200,400,600,800], colors:['red','pink','orange','green']}"))
plot(G4)

G5 <- gvisGeoChart(Andrew, "LatLong", colorvar='Speed_kt',options=list(region="US"))
plot(G5)
head(Andrew)

G6 <- gvisGeoChart(Andrew, "LatLong", sizevar='Speed_kt', colorvar="Pressure_mb", options=list(region="US"))
plot(G6)

#지진데이터
require(stats)
data(quakes)
head(quakes)

quakes$latlong <-paste(quakes$lat, quakes$long, sep=":")
head(quakes$latlong)

G7 <- gvisGeoChart(quakes, "latlong", "depth", "mag", options=list(displayMode="Markers", region="009",
colorAxis="{colors:['red','grey']}",backgroundColor="lightblue"))
plot(G7)

library(XML)
url <- "https://en.wikipedia.org/wiki/List_of_countries_by_credit_rating"
# which: 3번째 표를 가져온다는 뜻같다.
x <- readHTMLTable(readLines(url),which=3)

x <- x[2:132,]
colnames(x) <- c("Country","Rating","Outlook","Date","Ref")

# 타입알기 : typeof(x)
# level개념: factor = vector + 추가정보(level)
# 추가정보란 vector 값에서 겹치지 않은 unique한 값(vector)를 말한다
levels(x$Rating) <- substring(levels(x$Rating), 4, nchar(levels(x$Rating)))
x$Ranking <-x$Rating
levels(x$Ranking) <-nlevels(x$Ranking):1
x$Ranking <- as.character(x$Ranking)
x$Rating <-paste(x$Country, x$Rating, sep=":")

G8 <- gvisGeoChart(x, "Country", "Ranking", hovervar="Rating", options=list(gvis.editor="S&P",
colorAxis="{colors:['#91BFDB','#FC8D59']}"))
plot(G8)

library(XML)
eq <- read.csv("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.csv")
#paste 함수는 eq$latitude:eq$longitude 식으로 데이터를 붙여준다
eq$loc=paste(eq$latitude, eq$longitude, sep=":")
#데이터가 mag라고 name이 바뀌었다.
G9 <- gvisGeoChart(eq, "loc", "depth", "mag", options=list(displayMode="Markers",
colorAxis="{colors:['purple','red','orange','grey']}", backgroundColor="lightblue"), chartid="EQ")
plot(G9)

#샤이니 관련 코드: 실행을 못해봄=> shinyapp.io로 서비스이동
#options(repos=c(RStudeo='http://rstudio.org/_packages', getOption('repos')))
#install.packages("shiny")
#library(shiny)
#runExample("01_hello")
#runExample("02_text")
#runExample("03_reactivity")

install.packages("vcd")
library(vcd)
library(datasets)

data(Titanic)
str(Titanic)
mosaic(Titanic)
mosaic(Titanic, shade=TRUE, legend=TRUE)
mosaic(HairEyeColor, shade=TRUE, legend=TRUE)
strucplot(Titanic, pop=FALSE)
# 오류
# Error in editDLfromGPath(gPath, specs, strict, grep, global, redraw) : 
# 'gPath' (rect:Class=1st, Sex=Male, Age=Adult, Survived=YES)를 찾을 수 없습니다
grid.edit("rect:Class=1st, Sex=Male, Age=Adult, Survived=YES",gp=gpar(fill="red"))

