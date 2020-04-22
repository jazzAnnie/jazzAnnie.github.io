def to2dimension(list, length):
	ret = []
	while len(list) > 0:
		elem = []
		for i in range(0, length):
			elem.append(list[i])
		ret.append(elem)
		list = list[length:]
	return ret

l = [1, 2, 3, 4, 5, 6]
ret = to2dimension(l, 3)
print(ret)
