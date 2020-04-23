finger=c(27,480,493)
names(finger)=c("궁상문","제상문","와상문")

#상대도수분포표
prop.table(finger)

#수직막대그래프
barplot(finger, col="cyan", main="bar graph")

#수평막대그래프
barplot(finger, horiz=T, col="cyan", main="막대그래프")

#원형그래프
pie(finger, main="원형그래프")

#원형그래프(색깔지정)
slices=c("white", "grey50", "black")
pie(finger, col=slices, main="원형그래프")

#####################################
#도수분포표
#자료의입력
prop.woman=c(18,7,24,8,59,99,74,51,66,17,99,12,20,42,98,100,33,97,97,53)
prop.woman

#자료의 개수
 n=length(prop.woman)
 n