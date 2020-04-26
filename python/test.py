import matplotlib.pyplot as plt
 
import numpy as np
import pandas as pd
 
 
# 데이터 생성
x = np.arange(1,20)
y = np.arange(1,20)
z = np.arange(101,120)
 
x1=pd.DataFrame(x,columns={"x"})
y1=pd.DataFrame(y,columns={"y"})
z1=pd.DataFrame(z,columns={"z"})
 
temp_data1=pd.concat([x1,y1,z1],1)
temp_data1["cla"]="서울"
 
x = np.arange(1,20)
y = np.arange(11,30)
z = np.random.rand(19)*1000
 
x1=pd.DataFrame(x,columns={"x"})
y1=pd.DataFrame(y,columns={"y"})
z1=pd.DataFrame(z,columns={"z"})
 
temp_data2=pd.concat([x1,y1,z1],1)
temp_data2["cla"]="인천"
 
data=pd.concat([temp_data1,temp_data2],0)
 
# make a cla list
group_list=list(data["cla"].drop_duplicates())
 
fig=plt.figure()
 
# x축 y축 폭 결정
plt.xlim(data["x"].min(),data["x"].max())
plt.ylim(data["y"].min(),data["y"].max())
plt.ion()
 
# 색깔 정하기
color=list(["r","b","y","o","g","v"])
color_list=color[0:len(group_list)]
 
x_list=list(data["x"].drop_duplicates())
 
plt.pause(10)
 
for i in x_list:
 
 
    graph_list = list()
 
    for j in group_list:
        index=group_list.index(j)
        temp_data = data[data["x"] == i]
        temp_data=temp_data[temp_data["cla"]==j]
 
        graph=plt.scatter(temp_data["x"],temp_data["y"],s=temp_data["z"],c=color_list[index])
        graph_list.append(graph)
 
    plt.pause(0.1)
    if i==max(x_list):
        break
    else:
        for j in range(0,len(group_list)):
            graph_list[j].remove()
 
 
 
