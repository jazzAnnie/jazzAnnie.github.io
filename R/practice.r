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
